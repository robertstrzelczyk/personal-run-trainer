import { activitySport, SPORT_LABELS } from "../sport";
import type { ActivitySport, RunSummary } from "../types";
import { DAY_MS } from "./physiology";
import { startOfDay } from "./load";

export type StatsPeriod = "week" | "month" | "year";

export interface SportDistanceTotal {
  sport: ActivitySport;
  label: string;
  distanceM: number;
  durationS: number;
  count: number;
}

export interface PeriodSportStats {
  period: StatsPeriod;
  label: string;
  from: Date;
  to: Date;
  sports: SportDistanceTotal[];
  totalDistanceM: number;
}

const SPORTS: ActivitySport[] = ["running", "walking", "cycling"];

function periodStart(period: StatsPeriod, now: Date): Date {
  const end = startOfDay(now);
  if (period === "week") {
    // poniedziałek jako start tygodnia
    const day = (end.getDay() + 6) % 7;
    return new Date(end.getTime() - day * DAY_MS);
  }
  if (period === "month") {
    return new Date(end.getFullYear(), end.getMonth(), 1);
  }
  return new Date(end.getFullYear(), 0, 1);
}

function periodLabel(period: StatsPeriod): string {
  if (period === "week") return "Ten tydzień";
  if (period === "month") return "Ten miesiąc";
  return "Ten rok";
}

export function distanceBySport(
  runs: RunSummary[],
  from: Date,
  to: Date,
): SportDistanceTotal[] {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const buckets = new Map<ActivitySport, SportDistanceTotal>(
    SPORTS.map((sport) => [
      sport,
      { sport, label: SPORT_LABELS[sport], distanceM: 0, durationS: 0, count: 0 },
    ]),
  );

  for (const run of runs) {
    const t = new Date(run.startTime).getTime();
    if (t < fromMs || t > toMs) continue;
    const sport = activitySport(run);
    const bucket = buckets.get(sport)!;
    bucket.distanceM += run.distanceM;
    bucket.durationS += run.durationS;
    bucket.count += 1;
  }

  return SPORTS.map((s) => buckets.get(s)!);
}

export function sportStatsForPeriod(
  runs: RunSummary[],
  period: StatsPeriod,
  now: Date = new Date(),
): PeriodSportStats {
  const from = periodStart(period, now);
  const to = now;
  const sports = distanceBySport(runs, from, to);
  return {
    period,
    label: periodLabel(period),
    from,
    to,
    sports,
    totalDistanceM: sports.reduce((sum, s) => sum + s.distanceM, 0),
  };
}

export function allPeriodStats(runs: RunSummary[], now: Date = new Date()): PeriodSportStats[] {
  return (["week", "month", "year"] as StatsPeriod[]).map((p) =>
    sportStatsForPeriod(runs, p, now),
  );
}

export function formatKm(distanceM: number): string {
  if (distanceM < 100) return "0 km";
  return `${(distanceM / 1000).toFixed(distanceM >= 10_000 ? 1 : 2)} km`;
}
