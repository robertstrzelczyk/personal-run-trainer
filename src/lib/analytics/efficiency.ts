import type { Profile, RunSummary } from "../types";
import { DAY_MS, hrReserveFraction, median } from "./physiology";

export interface EfficiencyPoint {
  id: string;
  date: string;
  /** metry przebyte na jedno uderzenie serca (wyżej = lepiej) */
  metersPerBeat: number;
  beatsPerKm: number;
}

export type Verdict = "good" | "ok" | "poor" | "unknown";

export interface EfficiencySummary {
  points: EfficiencyPoint[];
  current: number | undefined;
  /** zmiana mediany z ostatnich 4 tygodni względem poprzednich 4 (ułamek) */
  change: number | undefined;
  decoupling: number | undefined;
  decouplingVerdict: Verdict;
  cadence: number | undefined;
  strideM: number | undefined;
  verdict: Verdict;
  headline: string;
}

export function metersPerBeat(run: RunSummary): number | undefined {
  if (!run.avgHr) return undefined;
  const beats = (run.avgHr * run.durationS) / 60;
  return run.distanceM / beats;
}

/** Biegi porównywalne: spokojny wysiłek aerobowy, na tyle długi, by tętno się ustabilizowało. */
function isAerobic(run: RunSummary, p: Profile) {
  if (!run.avgHr || run.durationS < 20 * 60) return false;
  const frac = hrReserveFraction(run.avgHr, p);
  return frac >= 0.45 && frac <= 0.82;
}

export function efficiencySummary(runs: RunSummary[], p: Profile, now: Date): EfficiencySummary {
  const sorted = [...runs].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const points: EfficiencyPoint[] = [];
  for (const r of sorted) {
    if (!isAerobic(r, p)) continue;
    const mpb = metersPerBeat(r);
    if (mpb) {
      points.push({
        id: r.id,
        date: r.startTime,
        metersPerBeat: mpb,
        beatsPerKm: 1000 / mpb,
      });
    }
  }

  const within = (from: number, to: number) =>
    points
      .filter((pt) => {
        const age = (now.getTime() - new Date(pt.date).getTime()) / DAY_MS;
        return age >= from && age < to;
      })
      .map((pt) => pt.metersPerBeat);
  const cur = within(0, 28);
  const prev = within(28, 56);
  const current = cur.length >= 2 ? median(cur) : points.at(-1)?.metersPerBeat;
  const change =
    cur.length >= 2 && prev.length >= 2 ? median(cur)! / median(prev)! - 1 : undefined;

  const longRuns = sorted
    .filter((r) => r.decouplingPct !== undefined && r.durationS >= 40 * 60)
    .filter((r) => (now.getTime() - new Date(r.startTime).getTime()) / DAY_MS <= 60)
    .map((r) => r.decouplingPct!);
  const decoupling = longRuns.length ? median(longRuns) : undefined;
  const decouplingVerdict: Verdict =
    decoupling === undefined ? "unknown" : decoupling < 5 ? "good" : decoupling < 8 ? "ok" : "poor";

  const recentRuns = sorted.filter(
    (r) => (now.getTime() - new Date(r.startTime).getTime()) / DAY_MS <= 42,
  );
  const cadences = recentRuns.map((r) => r.avgCadence).filter((c): c is number => !!c);
  const cadence = cadences.length ? Math.round(median(cadences)!) : undefined;
  const strides = recentRuns
    .filter((r) => r.avgCadence)
    .map((r) => (r.avgSpeed * 60) / r.avgCadence!);
  const strideM = strides.length ? median(strides) : undefined;

  let verdict: Verdict = "unknown";
  let headline = "Za mało spokojnych biegów, aby ocenić efektywność.";
  if (change !== undefined) {
    if (change > 0.015) {
      verdict = "good";
      headline = "Biegasz coraz oszczędniej: ten sam wysiłek daje więcej metrów.";
    } else if (change < -0.025) {
      verdict = "poor";
      headline = "Efektywność spadła. Możliwe zmęczenie, upał lub zbyt mała ilość spokojnego biegania.";
    } else {
      verdict = "ok";
      headline = "Efektywność jest stabilna.";
    }
  } else if (points.length >= 2) {
    verdict = "ok";
    headline = "Potrzeba jeszcze kilku tygodni danych, aby pokazać trend.";
  }

  return {
    points,
    current,
    change,
    decoupling,
    decouplingVerdict,
    cadence,
    strideM,
    verdict,
    headline,
  };
}
