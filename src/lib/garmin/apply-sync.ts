import type { Profile, RunSummary } from "../types";
import { syncGarmin, type SyncProgress, type SyncResult } from "./client";

export const AUTO_SYNC_HOURS = 6;
export const AUTO_SYNC_MS = AUTO_SYNC_HOURS * 60 * 60 * 1000;

export function shouldAutoSync(lastSync: string | null, enabled: boolean): boolean {
  if (!enabled) return false;
  if (!lastSync) return true;
  const age = Date.now() - new Date(lastSync).getTime();
  return Number.isFinite(age) && age >= AUTO_SYNC_MS;
}

export function mergeSyncIntoState(
  result: SyncResult,
  current: {
    profile: Profile;
    runs: RunSummary[];
    vo2: Array<{ date: string; value: number }>;
  },
): {
  profile: Profile;
  runs: RunSummary[];
  vo2: Array<{ date: string; value: number }>;
  lastSync: string;
} {
  let profile = { ...current.profile };
  if (result.maxHr || result.restHr) {
    profile = {
      ...profile,
      maxHr: result.maxHr ?? profile.maxHr,
      restHr: result.restHr ?? profile.restHr,
    };
  }

  const runs = [
    ...result.runs,
    ...current.runs.filter((r) => !result.runs.some((n) => n.id === r.id)),
  ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  let vo2 = current.vo2;
  if (result.vo2.length) {
    const map = new Map(current.vo2.map((v) => [v.date, v.value]));
    for (const v of result.vo2) map.set(v.date, v.value);
    vo2 = [...map.entries()].map(([date, value]) => ({ date, value }));
  }

  return {
    profile,
    runs,
    vo2,
    lastSync: new Date().toISOString(),
  };
}

export async function runGarminSync(options: {
  apiKey: string;
  days: number;
  known: Array<{ id: string; startTime: string }>;
  onProgress?: (p: SyncProgress) => void;
}): Promise<SyncResult> {
  return syncGarmin({
    apiKey: options.apiKey,
    days: options.days,
    known: options.known,
    onProgress: options.onProgress ?? (() => {}),
  });
}
