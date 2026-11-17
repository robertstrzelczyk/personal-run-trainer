import type { ActivitySport, RunSummary } from "./types";

export const SPORT_LABELS: Record<ActivitySport, string> = {
  running: "Bieganie",
  walking: "Chodzenie",
  cycling: "Kolarstwo",
};

export function activitySport(run: Pick<RunSummary, "sport">): ActivitySport {
  return run.sport ?? "running";
}

export function isRunning(run: Pick<RunSummary, "sport">): boolean {
  return activitySport(run) === "running";
}

export function normalizeSport(raw: string): ActivitySport | null {
  const s = raw.toLowerCase();
  if (s.includes("run") || s === "trail_running" || s === "treadmill_running") return "running";
  if (s.includes("walk") || s.includes("hik")) return "walking";
  if (s.includes("cycl") || s.includes("bike") || s.includes("bik")) return "cycling";
  return null;
}

export function runningOnly(runs: RunSummary[]): RunSummary[] {
  return runs.filter(isRunning);
}
