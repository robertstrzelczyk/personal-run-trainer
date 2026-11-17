import { NotARunError, parseRunFit } from "../fit/parse-run";
import type { ActivitySport, RunSummary } from "../types";
import {
  downloadActivityFit,
  fetchHeartRateSettings,
  fetchVo2Max,
  GarminHttpError,
  listRunningActivities,
  type GarminActivityItem,
} from "./personal-api";
import { clampDays, isoDate } from "./route-utils";

export async function activitiesForDays(token: string, rawDays: unknown) {
  const days = clampDays(rawDays, 90, 365);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
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

export async function metricsForDays(token: string, rawDays: unknown) {
  const days = clampDays(rawDays, 120, 365);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const [vo2, hr] = await Promise.allSettled([
    fetchVo2Max(token, isoDate(start), isoDate(end)),
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
