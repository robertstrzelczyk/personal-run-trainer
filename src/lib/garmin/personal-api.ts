import { unzipSync } from "fflate";
import { garminHttp } from "./http";

const DEFAULT_BASE = "https://personal.connectapi.garmin.com";

export class GarminHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GarminHttpError";
  }
}

function baseUrl() {
  return (process.env.GARMIN_PERSONAL_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
}

const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{10,8192}$/;

export function assertToken(token: unknown): string {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
    throw new GarminHttpError(400, "Nieprawidłowy token dostępu");
  }
  return token;
}

function explain(status: number): string {
  if (status === 401 || status === 403) {
    return "Garmin odrzucił klucz lub token. Sprawdź, czy klucz API jest aktywny i nie wygasł.";
  }
  if (status === 429) return "Garmin ogranicza liczbę zapytań. Spróbuj ponownie za kilka minut.";
  if (status === 404) return "Nie znaleziono danych w Garmin Connect.";
  return `Garmin odpowiedział błędem ${status}.`;
}

async function request(path: string, token: string, accept = "application/json") {
  let res: Response;
  try {
    res = await garminHttp(`${baseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: accept },
    });
  } catch {
    throw new GarminHttpError(502, "Nie udało się połączyć z Garmin Connect.");
  }
  if (!res.ok) throw new GarminHttpError(res.status, explain(res.status));
  return res;
}

export async function obtainToken(apiKey: string): Promise<string> {
  if (!/^[\x21-\x7e]{8,512}$/.test(apiKey)) {
    throw new GarminHttpError(400, "Klucz API ma nieprawidłowy format");
  }
  let res: Response;
  try {
    res = await garminHttp(
      `${baseUrl()}/personalapitoken-service/personal-api/personal-api-key/token`,
      {
        method: "POST",
        headers: { Authorization: `ApiKey ${apiKey}` },
      },
    );
  } catch {
    throw new GarminHttpError(502, "Nie udało się połączyć z Garmin Connect.");
  }
  if (!res.ok) throw new GarminHttpError(res.status, explain(res.status));
  const text = (await res.text()).trim();
  let token = text.replace(/^"|"$/g, "");
  if (text.startsWith("{")) {
    const json = JSON.parse(text) as Record<string, unknown>;
    token = String(json.access_token ?? json.accessToken ?? json.token ?? "");
  }
  return assertToken(token);
}

export interface GarminActivityItem {
  id: string;
  startTime: string;
  name?: string;
  distanceM?: number;
  durationS?: number;
}

function toIso(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function listRunningActivities(token: string, startDate: string, endDate: string) {
  const out: GarminActivityItem[] = [];
  const pageSize = 50;
  for (let start = 0; start < 500; start += pageSize) {
    const qs = new URLSearchParams({
      start: String(start),
      limit: String(pageSize),
      startDate,
      endDate,
      activityType: "running",
    });
    const res = await request(`/activitylist-service/activities/search/activities?${qs}`, token);
    const data = (await res.json()) as unknown;
    const list = Array.isArray(data)
      ? data
      : ((data as { activities?: unknown[]; activityList?: unknown[] })?.activities ??
        (data as { activityList?: unknown[] })?.activityList ??
        []);
    for (const raw of list as Array<Record<string, unknown>>) {
      const typeKey = String(
        (raw.activityType as { typeKey?: string } | undefined)?.typeKey ??
          raw.activityType ??
          raw.sportType ??
          "running",
      );
      if (!typeKey.includes("run")) continue;
      const startTime = toIso(raw.startTimeGMT) ?? toIso(raw.startTimeLocal);
      if (!raw.activityId || !startTime) continue;
      out.push({
        id: String(raw.activityId),
        startTime,
        name: typeof raw.activityName === "string" ? raw.activityName : undefined,
        distanceM: typeof raw.distance === "number" ? raw.distance : undefined,
        durationS: typeof raw.duration === "number" ? raw.duration : undefined,
      });
    }
    if (list.length < pageSize) break;
  }
  return out;
}

function isFit(bytes: Uint8Array) {
  return bytes.length > 12 && String.fromCharCode(...bytes.slice(8, 12)) === ".FIT";
}

export async function downloadActivityFit(token: string, activityId: string): Promise<Uint8Array> {
  if (!/^\d{1,20}$/.test(activityId)) throw new GarminHttpError(400, "Nieprawidłowe ID aktywności");
  const res = await request(
    `/download-service/files/activity/${activityId}`,
    token,
    "application/zip, application/x-zip-compressed, application/octet-stream",
  );
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (isFit(bytes)) return bytes;
  const files = unzipSync(bytes);
  const name = Object.keys(files).find((n) => n.toLowerCase().endsWith(".fit"));
  if (!name) throw new GarminHttpError(502, "Archiwum z Garmin nie zawiera pliku FIT.");
  return files[name];
}

function walk(node: unknown, visit: (obj: Record<string, unknown>) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === "object") {
    visit(node as Record<string, unknown>);
    Object.values(node as Record<string, unknown>).forEach((n) => walk(n, visit));
  }
}

export async function fetchVo2Max(token: string, startDate: string, endDate: string) {
  const res = await request(
    `/metrics-service/metrics/maxmet/daily/${startDate}/${endDate}`,
    token,
  );
  const data = (await res.json().catch(() => null)) as unknown;
  const found = new Map<string, number>();
  const items = Array.isArray(data) ? data : [data];
  for (const item of items as Array<Record<string, unknown> | null>) {
    const generic = (item?.generic ?? item) as Record<string, unknown> | undefined;
    if (!generic) continue;
    const value = Number(generic.vo2MaxPreciseValue ?? generic.vo2MaxValue);
    const date = String(generic.calendarDate ?? "");
    if (isFinite(value) && value > 10 && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      found.set(date.slice(0, 10), Math.round(value * 10) / 10);
    }
  }
  return [...found.entries()].map(([date, value]) => ({ date, value }));
}

export async function fetchHeartRateSettings(token: string) {
  const res = await request("/biometric-service/heartRateZones/v2", token);
  const data = (await res.json().catch(() => null)) as unknown;
  let maxHr: number | undefined;
  let restHr: number | undefined;
  walk(data, (obj) => {
    if (maxHr === undefined && Number(obj.maxHeartRateUsed) > 100) maxHr = Number(obj.maxHeartRateUsed);
    if (restHr === undefined && Number(obj.restingHeartRateUsed) > 25) {
      restHr = Number(obj.restingHeartRateUsed);
    }
  });
  return { maxHr, restHr };
}
