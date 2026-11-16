import type { Profile, RunSummary, VdotPaces } from "../types";
import { DAY_MS, fitnessLevel, median, pacesFromVdot, predictTime, vdotFromEffort, vo2maxFromRun } from "./physiology";

export interface Vo2Point {
  date: string;
  value: number;
}

export interface GarminVo2 {
  date: string;
  value: number;
}

export interface FitnessSummary {
  /** VO2max użyte do oceny poziomu */
  vo2max: number | undefined;
  vo2Source: "garmin" | "estimate" | "none";
  estimate: number | undefined;
  garmin: number | undefined;
  runPoints: Vo2Point[];
  level: ReturnType<typeof fitnessLevel> | undefined;
  vdot: number | undefined;
  paces: VdotPaces | undefined;
  predictions: Array<{ label: string; distanceM: number; timeS: number }>;
  /** zmiana oszacowania w ostatnich 6 tygodniach vs. poprzednie 6 */
  trend: number | undefined;
}

const RACES = [
  { label: "5 km", distanceM: 5000 },
  { label: "10 km", distanceM: 10000 },
  { label: "Półmaraton", distanceM: 21097.5 },
  { label: "Maraton", distanceM: 42195 },
];

function bestEffortVdot(runs: RunSummary[], now: Date): number | undefined {
  const cutoff = now.getTime() - 90 * DAY_MS;
  let best: number | undefined;
  for (const r of runs) {
    if (new Date(r.startTime).getTime() < cutoff || !r.best) continue;
    for (const [d, t] of Object.entries(r.best)) {
      if (Number(d) < 3000) continue;
      const v = vdotFromEffort(Number(d), t);
      if (best === undefined || v > best) best = v;
    }
  }
  return best;
}

export function fitnessSummary(
  runs: RunSummary[],
  profile: Profile,
  garminSeries: GarminVo2[],
  now: Date,
): FitnessSummary {
  const sorted = [...runs].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const runPoints: Vo2Point[] = [];
  for (const r of sorted) {
    const v = vo2maxFromRun(r, profile);
    if (v !== undefined) runPoints.push({ date: r.startTime, value: v });
  }

  const recent = (days: number, offset = 0) =>
    runPoints
      .filter((p) => {
        const age = (now.getTime() - new Date(p.date).getTime()) / DAY_MS;
        return age >= offset && age < offset + days;
      })
      .map((p) => p.value);

  let sample = recent(42);
  if (sample.length < 3) sample = runPoints.slice(-6).map((p) => p.value);
  const estimate = sample.length >= 2 ? median(sample) : undefined;

  const prior = recent(42, 42);
  const current = recent(42);
  const trend =
    prior.length >= 2 && current.length >= 2
      ? (median(current) ?? 0) - (median(prior) ?? 0)
      : undefined;

  const garminSorted = [...garminSeries].sort((a, b) => a.date.localeCompare(b.date));
  const garmin = garminSorted.at(-1)?.value;

  const vo2max = garmin ?? estimate;
  const vo2Source = garmin !== undefined ? "garmin" : estimate !== undefined ? "estimate" : "none";

  const effort = bestEffortVdot(sorted, now);
  let vdot: number | undefined;
  if (vo2max !== undefined) {
    const base = garmin !== undefined ? garmin * 0.96 : vo2max;
    vdot = effort !== undefined ? Math.max(base, effort) : base;
  } else if (effort !== undefined) {
    vdot = effort;
  }

  const paces = vdot !== undefined ? pacesFromVdot(vdot) : undefined;
  const predictions =
    vdot !== undefined
      ? RACES.map((r) => ({ ...r, timeS: predictTime(vdot, r.distanceM) }))
      : [];

  return {
    vo2max,
    vo2Source,
    estimate,
    garmin,
    runPoints,
    level: vo2max !== undefined ? fitnessLevel(vo2max, profile.age, profile.sex) : undefined,
    vdot,
    paces,
    predictions,
    trend,
  };
}
