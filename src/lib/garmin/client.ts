import type { RunSummary } from "../types";
import { GarminHttpError, obtainToken } from "./personal-api";
import { pause } from "./rate-limit";
import { activitiesForDays, activityFromListItem, metricsForDays } from "./service";

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
  /** true gdy 429 / pominięte dni listy / błędy pobierania */
  incomplete?: boolean;
  /** id aktywności pominiętych (np. nie-bieg) — nie pobieraj ponownie */
  ignoredIds?: string[];
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function direct<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof GarminHttpError) throw new ApiError(error.message, error.status);
    throw error;
  }
}

interface KnownRun {
  id: string;
  startTime: string;
}

export async function syncGarmin(options: {
  apiKey: string;
  days: number;
  known: KnownRun[];
  ignoredIds?: string[];
  onProgress: (p: SyncProgress) => void;
}): Promise<SyncResult> {
  const { apiKey, days, known, onProgress } = options;
  const ignored = new Set(options.ignoredIds ?? []);

  onProgress({ phase: "token" });
  const token = await direct(() => obtainToken(apiKey.trim()));

  onProgress({ phase: "list" });
  const listed = await direct(() => activitiesForDays(token, days));
  const activities = listed.items;
  const warnings: string[] = [...listed.warnings];
  let incomplete = listed.warnings.length > 0;

  const knownTimes = known.map((k) => new Date(k.startTime).getTime());
  const knownIds = new Set(known.map((k) => k.id));
  const pending = activities.filter((a) => {
    const gid = `garmin-${a.id}`;
    if (knownIds.has(gid) || ignored.has(gid) || ignored.has(a.id)) return false;
    const t = new Date(a.startTime).getTime();
    return !knownTimes.some((kt) => Math.abs(kt - t) < 90_000);
  });

  const runs: RunSummary[] = [];
  const newIgnored: string[] = [];
  let failed = 0;
  let done = 0;
  onProgress({ phase: "download", done, total: pending.length });

  let fatal: ApiError | undefined;
  for (const activity of pending) {
    if (fatal) break;
    try {
      const result = await direct(() => activityFromListItem(token, activity));
      if (result.run) runs.push(result.run);
      else if (result.skipped) {
        newIgnored.push(`garmin-${activity.id}`);
      }
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        fatal = error;
        break;
      }
      if (error instanceof ApiError && error.status === 429) {
        warnings.push(
          "Garmin ograniczył zapytania w trakcie pobierania. Zapisuję to, co już jest — dokończ sync później (paczka / większy zakres).",
        );
        incomplete = true;
        break;
      }
      failed++;
      incomplete = true;
    } finally {
      done++;
      onProgress({ phase: "download", done, total: pending.length });
    }
    await pause(150);
  }
  if (fatal) throw fatal;

  onProgress({ phase: "metrics" });
  let vo2: SyncResult["vo2"] = [];
  let maxHr: number | undefined;
  let restHr: number | undefined;
  try {
    const metrics = await direct(() => metricsForDays(token, days));
    vo2 = metrics.vo2;
    maxHr = metrics.maxHr;
    restHr = metrics.restHr;
    warnings.push(...(metrics.warnings ?? []));
  } catch {
    warnings.push("Nie udało się pobrać metryk VO2/stref tętna.");
  }

  return {
    runs,
    vo2,
    maxHr,
    restHr,
    alreadyKnown: activities.length - pending.length,
    failed,
    warnings,
    incomplete: incomplete || failed > 0,
    ignoredIds: newIgnored,
  };
}

export { ApiError as GarminSyncError };
