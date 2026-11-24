import { NotARunError, parseRunFit } from "../fit/parse-run";
import type { ActivitySport, RunSummary } from "../types";
import {
  downloadActivityFit,
  fetchHeartRateSettings,
  fetchVo2Max,
  FULL_HISTORY_DAYS,
  GarminHttpError,
  listRunningActivities,
  type GarminActivityItem,
} from "./personal-api";
import { clampDays, isoDate } from "./route-utils";

/** Sentinel: synchro od ~10 lat wstecz (cała dostępna historia w praktyce). */
export const SYNC_ALL_HISTORY = 0;

export function resolveSyncDays(rawDays: unknown): number {
  const n = Number(rawDays);
  if (!isFinite(n) || n <= 0) return FULL_HISTORY_DAYS;
  return clampDays(n, 90, FULL_HISTORY_DAYS);
}

export async function activitiesForDays(token: string, rawDays: unknown) {
  const days = resolveSyncDays(rawDays);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  // endDate +1 dzień — Garmin bywa wybredny na strefy czasowe
  return listRunningActivities(token, isoDate(start), isoDate(new Date(end.getTime() + 86_400_000)));
}

export async function runForActivity(
  token: string,
  id: string,
  sportHint?: ActivitySport,
): Promise<{ run?: RunSummary; skipped?: boolean; reason?: string }> {
  const bytes = await downloadActivityFit(token, id);
  try {
    return { run: parseRunFit(bytes, "garmin", `garmin-${id}`, sportHint) };
  } catch (error) {
    if (error instanceof NotARunError) return { skipped: true, reason: error.message };
    throw new GarminHttpError(422, error instanceof Error ? error.message : "Nie udało się odczytać pliku FIT");
  }
}

export async function activityFromListItem(
  token: string,
  item: GarminActivityItem,
): Promise<{ run?: RunSummary; skipped?: boolean; reason?: string }> {
  return runForActivity(token, item.id, item.sport);
}

async function fetchVo2Chunked(token: string, start: Date, end: Date) {
  const out = new Map<string, number>();
  const chunkDays = 28;
  let cursor = new Date(start);
  while (cursor <= end) {
    const chunkEnd = new Date(cursor.getTime() + (chunkDays - 1) * 86_400_000);
    const to = chunkEnd < end ? chunkEnd : end;
    try {
      const rows = await fetchVo2Max(token, isoDate(cursor), isoDate(to));
      for (const row of rows) out.set(row.date, row.value);
    } catch {
      // pojedyncze okno VO2 może paść — nie blokujemy syncu aktywności
    }
    cursor = new Date(to.getTime() + 86_400_000);
  }
  return [...out.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function metricsForDays(token: string, rawDays: unknown) {
  const days = resolveSyncDays(rawDays);
  // VO2: max ostatni rok w chunkach (metryki dzienne Garmin też mają limity zakresu)
  const vo2Days = Math.min(days, 365);
  const end = new Date();
  const vo2Start = new Date(end.getTime() - vo2Days * 86_400_000);
  const [vo2, hr] = await Promise.allSettled([
    fetchVo2Chunked(token, vo2Start, end),
    fetchHeartRateSettings(token),
  ]);
  return {
    vo2: vo2.status === "fulfilled" ? vo2.value : [],
    maxHr: hr.status === "fulfilled" ? hr.value.maxHr : undefined,
    restHr: hr.status === "fulfilled" ? hr.value.restHr : undefined,
    warnings: [
      ...(vo2.status === "rejected" ? ["Nie udało się pobrać VO2max z Garmin."] : []),
      ...(hr.status === "rejected" ? ["Nie udało się pobrać stref tętna z Garmin."] : []),
    ],
  };
}
