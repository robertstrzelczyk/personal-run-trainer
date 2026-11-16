import type { RunSummary } from "../types";
import { isNativeApp } from "../platform";
import { activitiesForDays, metricsForDays, runForActivity } from "./service";
import { GarminHttpError, obtainToken } from "./personal-api";

export interface SyncProgress {
  phase: "token" | "list" | "download" | "metrics";
  done?: number;
  total?: number;
}

export interface SyncResult {
  runs: RunSummary[];
  vo2: Array<{ date: string; value: number }>;
  maxHr?: number;
  restHr?: number;
  alreadyKnown: number;
  failed: number;
  warnings: string[];
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Błąd ${res.status}`, res.status);
  return data;
}

interface MetricsResult {
  vo2: SyncResult["vo2"];
  maxHr?: number;
  restHr?: number;
  warnings?: string[];
}

interface GarminOps {
  token(apiKey: string): Promise<string>;
  activities(token: string, days: number): Promise<Array<{ id: string; startTime: string }>>;
  run(token: string, id: string): Promise<{ run?: RunSummary; skipped?: boolean }>;
  metrics(token: string, days: number): Promise<MetricsResult>;
}

const serverOps: GarminOps = {
  token: async (apiKey) => (await post<{ token: string }>("/api/garmin/token", { apiKey })).token,
  activities: async (token, days) =>
    (await post<{ activities: Array<{ id: string; startTime: string }> }>("/api/garmin/activities", { token, days }))
      .activities,
  run: (token, id) => post("/api/garmin/run", { token, id }),
  metrics: (token, days) => post("/api/garmin/metrics", { token, days }),
};

async function direct<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof GarminHttpError) throw new ApiError(error.message, error.status);
    throw error;
  }
}

/** W aplikacji mobilnej telefon sam rozmawia z Garmin Connect, bez pośredniczącego serwera. */
const deviceOps: GarminOps = {
  token: (apiKey) => direct(() => obtainToken(apiKey.trim())),
  activities: (token, days) => direct(() => activitiesForDays(token, days)),
  run: (token, id) => direct(() => runForActivity(token, id)),
  metrics: (token, days) => direct(() => metricsForDays(token, days)),
};

interface KnownRun {
  id: string;
  startTime: string;
}

export async function syncGarmin(options: {
  apiKey: string;
  days: number;
  known: KnownRun[];
  onProgress: (p: SyncProgress) => void;
}): Promise<SyncResult> {
  const { apiKey, days, known, onProgress } = options;
  const ops = isNativeApp() ? deviceOps : serverOps;

  onProgress({ phase: "token" });
  const token = await ops.token(apiKey);

  onProgress({ phase: "list" });
  const activities = await ops.activities(token, days);

  const knownTimes = known.map((k) => new Date(k.startTime).getTime());
  const knownIds = new Set(known.map((k) => k.id));
  const pending = activities.filter((a) => {
    if (knownIds.has(`garmin-${a.id}`)) return false;
    const t = new Date(a.startTime).getTime();
    return !knownTimes.some((kt) => Math.abs(kt - t) < 90_000);
  });

  const runs: RunSummary[] = [];
  let failed = 0;
  let done = 0;
  const warnings: string[] = [];
  onProgress({ phase: "download", done, total: pending.length });

  let cursor = 0;
  let fatal: ApiError | undefined;
  const worker = async () => {
    while (cursor < pending.length && !fatal) {
      const activity = pending[cursor++];
      try {
        const result = await ops.run(token, activity.id);
        if (result.run) runs.push(result.run);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 429)) {
          fatal = error;
        } else {
          failed++;
        }
      }
      onProgress({ phase: "download", done: ++done, total: pending.length });
    }
  };
  await Promise.all([worker(), worker()]);
  if (fatal) warnings.push(fatal.message);

  onProgress({ phase: "metrics" });
  let vo2: SyncResult["vo2"] = [];
  let maxHr: number | undefined;
  let restHr: number | undefined;
  if (!fatal) {
    try {
      const metrics = await ops.metrics(token, Math.max(days, 60));
      vo2 = metrics.vo2;
      maxHr = metrics.maxHr;
      restHr = metrics.restHr;
      warnings.push(...(metrics.warnings ?? []));
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Nie udało się pobrać metryk Garmin");
    }
  }

  return {
    runs,
    vo2,
    maxHr,
    restHr,
    alreadyKnown: activities.length - pending.length,
    failed,
    warnings,
  };
}
