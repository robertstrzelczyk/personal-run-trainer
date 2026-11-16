import type { Profile, RunSummary, Sex, VdotPaces } from "../types";

export const DAY_MS = 86_400_000;

export function hrReserveFraction(hr: number, p: Pick<Profile, "maxHr" | "restHr">) {
  const frac = (hr - p.restHr) / (p.maxHr - p.restHr);
  return Math.min(1.1, Math.max(0, frac));
}

export function hrFromReserve(frac: number, p: Pick<Profile, "maxHr" | "restHr">) {
  return Math.round(p.restHr + frac * (p.maxHr - p.restHr));
}

/** Tętno maksymalne wg Tanaki, gdy użytkownik go nie zna. */
export function estimateMaxHr(age: number) {
  return Math.round(208 - 0.7 * age);
}

// --- Daniels / Gilbert -------------------------------------------------

/** zużycie tlenu (ml/kg/min) przy prędkości v (m/min) */
export function vo2AtSpeed(v: number) {
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
}

export function speedAtVo2(vo2: number) {
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.6 + vo2);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** VDOT z wyniku na dystansie (Daniels/Gilbert) */
export function vdotFromEffort(distanceM: number, timeS: number) {
  const tMin = timeS / 60;
  const v = distanceM / tMin;
  const pct =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * tMin) +
    0.2989558 * Math.exp(-0.1932605 * tMin);
  return vo2AtSpeed(v) / pct;
}

/** czas (s) przewidywany na dystansie dla danego VDOT */
export function predictTime(vdot: number, distanceM: number) {
  let lo = 60;
  let hi = 60 * 60 * 8;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdotFromEffort(distanceM, mid) > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** tempo (s/km) przy danym ułamku VDOT */
function paceAt(vdot: number, fraction: number) {
  const v = speedAtVo2(vdot * fraction);
  return 1000 / (v / 60);
}

export function pacesFromVdot(vdot: number): VdotPaces {
  const zone = (slow: number, fast: number): [number, number] => [
    paceAt(vdot, fast),
    paceAt(vdot, slow),
  ];
  return {
    vdot,
    easy: zone(0.62, 0.72),
    marathon: zone(0.79, 0.83),
    threshold: zone(0.85, 0.88),
    interval: zone(0.96, 1.0),
    repetition: zone(1.04, 1.1),
  };
}

// --- Szacowanie VO2max z tętna i tempa ---------------------------------

/**
 * Szacunek VO2max z pojedynczego biegu: zużycie tlenu wynikające z tempa
 * podzielone przez ułamek rezerwy tętna (VO2R ≈ HRR, ACSM).
 */
export function vo2maxFromRun(run: RunSummary, p: Profile): number | undefined {
  if (!run.avgHr || run.durationS < 12 * 60) return undefined;
  const frac = hrReserveFraction(run.avgHr, p);
  if (frac < 0.6 || frac > 1.0) return undefined;
  const v = run.avgSpeed * 60;
  if (v < 100 || v > 400) return undefined;
  const vo2 = 3.5 + 0.2 * v;
  return 3.5 + (vo2 - 3.5) / frac;
}

export function median(values: number[]) {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// --- Poziom sprawności --------------------------------------------------

export type FitnessLevel = "low" | "fair" | "good" | "very-good" | "superior";

export const LEVEL_LABELS: Record<FitnessLevel, string> = {
  low: "Niski",
  fair: "Przeciętny",
  good: "Dobry",
  "very-good": "Bardzo dobry",
  superior: "Wybitny",
};

const MALE_BANDS: Array<[number, number[]]> = [
  [29, [41.7, 45.4, 51.1, 55.4]],
  [39, [40.5, 44.0, 48.3, 54.0]],
  [49, [38.5, 42.4, 46.4, 52.5]],
  [59, [35.6, 39.2, 43.4, 48.9]],
  [69, [32.3, 35.5, 39.5, 45.7]],
  [200, [29.4, 32.3, 36.7, 42.1]],
];

const FEMALE_BANDS: Array<[number, number[]]> = [
  [29, [36.1, 39.5, 43.9, 49.6]],
  [39, [34.4, 37.8, 42.4, 47.4]],
  [49, [33.0, 36.3, 39.7, 45.3]],
  [59, [30.1, 33.0, 36.7, 41.1]],
  [69, [27.5, 30.0, 33.0, 37.8]],
  [200, [25.9, 28.1, 30.9, 36.7]],
];

const LEVELS: FitnessLevel[] = ["low", "fair", "good", "very-good", "superior"];

export function fitnessLevel(vo2max: number, age: number, sex: Sex) {
  const bands = sex === "male" ? MALE_BANDS : FEMALE_BANDS;
  const thresholds = (bands.find(([maxAge]) => age <= maxAge) ?? bands.at(-1)!)[1];
  let idx = 0;
  while (idx < thresholds.length && vo2max >= thresholds[idx]) idx++;
  const lower = idx === 0 ? thresholds[0] - 8 : thresholds[idx - 1];
  const upper = idx === thresholds.length ? thresholds[idx - 1] + 8 : thresholds[idx];
  return {
    level: LEVELS[idx],
    label: LEVEL_LABELS[LEVELS[idx]],
    /** 0-1 postęp w obrębie bieżącej kategorii */
    progress: Math.min(1, Math.max(0, (vo2max - lower) / (upper - lower))),
    index: idx,
    thresholds,
  };
}

// --- Formatowanie -------------------------------------------------------

export function formatPace(secPerKm: number | undefined) {
  if (!secPerKm || !isFinite(secPerKm)) return "—";
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(totalS: number) {
  const t = Math.round(totalS);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatMinutes(totalS: number) {
  const m = Math.round(totalS / 60);
  if (m >= 60) return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
  return `${m} min`;
}

export function paceOfRun(run: RunSummary) {
  return 1000 / run.avgSpeed;
}
