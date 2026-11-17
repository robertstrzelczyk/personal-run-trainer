import { Decoder, Stream } from "@garmin/fitsdk";
import { normalizeSport } from "../sport";
import type { ActivitySport, RunSource, RunSummary } from "../types";

export class NotARunError extends Error {
  constructor(sport: string) {
    super(`Nieobsługiwany sport: ${sport}`);
    this.name = "NotARunError";
  }
}

interface Rec {
  t: number;
  hr?: number;
  speed?: number;
  dist?: number;
}

const BEST_DISTANCES = [1000, 3000, 5000, 10000];
const MOVING_SPEED = 0.8;

const MIN_BY_SPORT: Record<ActivitySport, { distanceM: number; durationS: number }> = {
  running: { distanceM: 300, durationS: 120 },
  walking: { distanceM: 200, durationS: 120 },
  cycling: { distanceM: 500, durationS: 120 },
};

function bestEffort(recs: Rec[], target: number): number | undefined {
  const pts = recs.filter((r) => r.dist !== undefined);
  let best: number | undefined;
  let j = 0;
  for (let i = 0; i < pts.length; i++) {
    while (j < pts.length - 1 && pts[j].dist! - pts[i].dist! < target) j++;
    if (pts[j].dist! - pts[i].dist! >= target) {
      const dt = pts[j].t - pts[i].t;
      if (dt > 0 && (best === undefined || dt < best)) best = dt;
    }
  }
  return best;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function decoupling(recs: Rec[]): number | undefined {
  const moving = recs.filter(
    (r) => r.hr !== undefined && r.hr > 40 && (r.speed ?? 0) > MOVING_SPEED,
  );
  if (moving.length < 20 * 60 * 0.5) return undefined;
  const span = moving[moving.length - 1].t - moving[0].t;
  if (span < 20 * 60) return undefined;
  const start = Math.floor(moving.length * 0.1);
  const body = moving.slice(start);
  const half = Math.floor(body.length / 2);
  const a = body.slice(0, half);
  const b = body.slice(half);
  const ef = (part: Rec[]) => mean(part.map((r) => r.speed!)) / mean(part.map((r) => r.hr!));
  const efA = ef(a);
  const efB = ef(b);
  if (!isFinite(efA) || !isFinite(efB) || efA <= 0) return undefined;
  return ((efA - efB) / efA) * 100;
}

function hrHistogram(recs: Rec[]): Record<string, number> | undefined {
  const hist: Record<string, number> = {};
  let total = 0;
  for (let i = 1; i < recs.length; i++) {
    const hr = recs[i].hr;
    if (!hr || hr < 30) continue;
    const dt = Math.min(recs[i].t - recs[i - 1].t, 10);
    if (dt <= 0) continue;
    hist[hr] = (hist[hr] ?? 0) + dt;
    total += dt;
  }
  if (total === 0) return undefined;
  for (const k of Object.keys(hist)) hist[k] = Math.round(hist[k]);
  return hist;
}

export function parseRunFit(
  bytes: Uint8Array,
  source: RunSource,
  idOverride?: string,
  sportHint?: ActivitySport,
): RunSummary {
  const stream = Stream.fromByteArray(Array.from(bytes));
  const decoder = new Decoder(stream);
  if (!decoder.isFIT()) throw new Error("To nie jest poprawny plik FIT");
  const { messages } = decoder.read({ mergeHeartRates: true });

  const session = messages.sessionMesgs?.[0];
  if (!session) throw new Error("Plik FIT nie zawiera podsumowania aktywności");
  const rawSport = String(session.sport ?? "unknown");
  const sport = sportHint ?? normalizeSport(rawSport);
  if (!sport) throw new NotARunError(rawSport);

  const records = (messages.recordMesgs ?? []) as Array<Record<string, unknown>>;
  const startMs = new Date(
    (session.startTime as Date | undefined) ??
      (records[0]?.timestamp as Date | undefined) ??
      Date.now(),
  ).getTime();

  const recs: Rec[] = [];
  const cadences: number[] = [];
  for (const r of records) {
    const ts = r.timestamp as Date | undefined;
    if (!ts) continue;
    const speed = (r.enhancedSpeed ?? r.speed) as number | undefined;
    const cadence = r.cadence as number | undefined;
    if (cadence && (speed ?? 0) > MOVING_SPEED) {
      const multiplier = sport === "cycling" ? 1 : 2;
      cadences.push((cadence + ((r.fractionalCadence as number) ?? 0)) * multiplier);
    }
    recs.push({
      t: (new Date(ts).getTime() - startMs) / 1000,
      hr: r.heartRate as number | undefined,
      speed,
      dist: r.distance as number | undefined,
    });
  }

  const distanceM =
    (session.totalDistance as number | undefined) ??
    recs.filter((r) => r.dist !== undefined).at(-1)?.dist ??
    0;
  const durationS =
    (session.totalTimerTime as number | undefined) ??
    (session.totalElapsedTime as number | undefined) ??
    0;
  const min = MIN_BY_SPORT[sport];
  if (distanceM < min.distanceM || durationS < min.durationS) {
    throw new Error("Aktywność jest zbyt krótka, aby ją analizować");
  }

  const hrValues = recs
    .map((r) => r.hr)
    .filter((h): h is number => h !== undefined && h > 30);
  const avgHr =
    (session.avgHeartRate as number | undefined) ??
    (hrValues.length ? Math.round(mean(hrValues)) : undefined);
  const maxHr =
    (session.maxHeartRate as number | undefined) ??
    (hrValues.length ? Math.max(...hrValues) : undefined);

  const avgCadenceSession = session.avgCadence as number | undefined;
  const avgCadence = cadences.length
    ? Math.round(mean(cadences))
    : avgCadenceSession
      ? Math.round(avgCadenceSession * (sport === "cycling" ? 1 : 2))
      : undefined;

  const best: Record<string, number> = {};
  if (sport === "running") {
    for (const d of BEST_DISTANCES) {
      if (distanceM >= d) {
        const t = bestEffort(recs, d);
        if (t) best[d] = Math.round(t);
      }
    }
  }

  const startTime = new Date(startMs).toISOString();
  return {
    id: idOverride ?? `fit-${startMs}`,
    source,
    sport,
    startTime,
    distanceM: Math.round(distanceM),
    durationS: Math.round(durationS),
    avgHr: avgHr ? Math.round(avgHr) : undefined,
    maxHr: maxHr ? Math.round(maxHr) : undefined,
    avgSpeed: distanceM / durationS,
    avgCadence,
    ascentM: session.totalAscent as number | undefined,
    decouplingPct: sport === "running" ? decoupling(recs) : undefined,
    hrHist: hrHistogram(recs),
    best: Object.keys(best).length ? best : undefined,
  };
}
