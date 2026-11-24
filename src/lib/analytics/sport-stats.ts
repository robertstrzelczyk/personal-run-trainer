import { activitySport, SPORT_LABELS } from "../sport";
import type { ActivitySport, RunSummary } from "../types";
import { DAY_MS } from "./physiology";
import { startOfDay } from "./load";

export type StatsPeriod = "week" | "month" | "year";

/** Filtr podsumowania: wszystkie sporty albo jeden. */
export type SportFilter = "all" | ActivitySport;

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

export function sportFilterLabel(filter: SportFilter): string {
  if (filter === "all") return "łącznie we wszystkich sportach";
  return `tylko ${SPORT_LABELS[filter].toLowerCase()}`;
}

export function totalForSportFilter(
  stats: PeriodSportStats,
  filter: SportFilter,
): { distanceM: number; durationS: number; count: number } {
  if (filter === "all") {
    return {
      distanceM: stats.totalDistanceM,
      durationS: stats.sports.reduce((s, x) => s + x.durationS, 0),
      count: stats.sports.reduce((s, x) => s + x.count, 0),
    };
  }
  const row = stats.sports.find((s) => s.sport === filter);
  return {
    distanceM: row?.distanceM ?? 0,
    durationS: row?.durationS ?? 0,
    count: row?.count ?? 0,
  };
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

export interface DailyDistancePoint {
  date: string;
  distanceKm: number;
  runningKm: number;
  walkingKm: number;
  cyclingKm: number;
}

/** Dzienne sumy dystansu (km) wstecz od `now` — do wykresów. */
export function dailyDistanceSeries(
  runs: RunSummary[],
  days: number,
  now: Date = new Date(),
  filter: SportFilter = "all",
): DailyDistancePoint[] {
  const end = startOfDay(now);
  const byDay = new Map<string, DailyDistancePoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY_MS);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, {
      date: key,
      distanceKm: 0,
      runningKm: 0,
      walkingKm: 0,
      cyclingKm: 0,
    });
  }
  for (const run of runs) {
    const sport = activitySport(run);
    if (filter !== "all" && sport !== filter) continue;
    const t = startOfDay(run.startTime);
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    const bucket = byDay.get(key);
    if (!bucket) continue;
    const km = run.distanceM / 1000;
    bucket.distanceKm += km;
    if (sport === "running") bucket.runningKm += km;
    else if (sport === "walking") bucket.walkingKm += km;
    else bucket.cyclingKm += km;
  }
  return [...byDay.values()];
}
