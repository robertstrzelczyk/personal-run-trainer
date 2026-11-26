import type { Profile, RunSummary } from "../types";
import { DAY_MS, hrReserveFraction } from "./physiology";

export function dayKey(date: Date | string | number) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Lokalna data YYYY-MM-DD (alias dayKey). */
export function toIsoLocal(date: Date | string | number) {
  return dayKey(date);
}

export function startOfDay(date: Date | string | number) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Dodaj dni kalendarzowe lokalnie (bezpieczne przy zmianie czasu). */
export function addLocalDays(date: Date | string | number, days: number) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** Obciążenie treningowe (TRIMP wg Banistera) */
export function runLoad(run: RunSummary, p: Profile): number {
  const k = p.sex === "male" ? 1.92 : 1.67;
  const trimp = (frac: number, minutes: number) =>
    minutes * frac * 0.64 * Math.exp(k * frac);

  if (run.hrHist) {
    let sum = 0;
    for (const [bpm, seconds] of Object.entries(run.hrHist)) {
      sum += trimp(Math.min(1, hrReserveFraction(Number(bpm), p)), seconds / 60);
    }
    return sum;
  }
  const frac = run.avgHr ? Math.min(1, hrReserveFraction(run.avgHr, p)) : 0.6;
  return trimp(frac, run.durationS / 60);
}

export interface RunIntensity {
  avgFrac: number;
  hardShare: number;
  isHard: boolean;
  isLong: boolean;
}

export function classifyRun(run: RunSummary, p: Profile, medianDurationS: number): RunIntensity {
  const avgFrac = run.avgHr ? hrReserveFraction(run.avgHr, p) : 0.6;
  let hardShare = 0;
  if (run.hrHist) {
    let hard = 0;
    let total = 0;
    for (const [bpm, seconds] of Object.entries(run.hrHist)) {
      total += seconds;
      if (hrReserveFraction(Number(bpm), p) >= 0.8) hard += seconds;
    }
    hardShare = total ? hard / total : 0;
  }
  const isLong =
    run.durationS >= 75 * 60 ||
    (run.durationS >= 45 * 60 && run.durationS >= 1.6 * medianDurationS);
  const isHard = run.durationS >= 12 * 60 && (avgFrac >= 0.76 || hardShare >= 0.2);
  return { avgFrac, hardShare, isHard, isLong };
}

export interface LoadPoint {
  date: string;
  load: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export function loadSeries(runs: RunSummary[], p: Profile, until: Date): LoadPoint[] {
  if (!runs.length) return [];
  const byDay = new Map<string, number>();
  for (const r of runs) {
    const k = dayKey(r.startTime);
    byDay.set(k, (byDay.get(k) ?? 0) + runLoad(r, p));
  }
  const first = startOfDay(
    Math.min(...runs.map((r) => new Date(r.startTime).getTime())),
  );
  const end = startOfDay(until);
  const totalDays = daysBetween(first, end);

  const warmupLoads: number[] = [];
  for (let i = 0; i < Math.min(14, totalDays + 1); i++) {
    warmupLoads.push(byDay.get(dayKey(new Date(first.getTime() + i * DAY_MS))) ?? 0);
  }
  const seed = warmupLoads.reduce((a, b) => a + b, 0) / Math.max(1, warmupLoads.length);

  let ctl = seed * 0.6;
  let atl = seed * 0.6;
  const series: LoadPoint[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const day = new Date(first.getTime() + i * DAY_MS);
    const load = byDay.get(dayKey(day)) ?? 0;
    ctl = ctl + (load - ctl) / 42;
    atl = atl + (load - atl) / 7;
    series.push({ date: dayKey(day), load, ctl, atl, tsb: ctl - atl });
  }
  return series;
}

export type FormStatus =
  | "overload"
  | "building"
  | "maintaining"
  | "detraining"
  | "fresh"
  | "unknown";

export const FORM_LABELS: Record<FormStatus, string> = {
  overload: "Przeciążenie",
  building: "Budowanie formy",
  maintaining: "Utrzymanie",
  detraining: "Spadek formy",
  fresh: "Zregenerowany",
  unknown: "Za mało danych",
};

export interface FormState {
  status: FormStatus;
  ctl: number;
  atl: number;
  /** forma dziś rano: CTL − ATL z poprzedniego dnia */
  tsb: number;
  ctlChange4w: number;
  acwr: number | undefined;
}

export function formState(series: LoadPoint[], runs: RunSummary[], p: Profile, now: Date): FormState {
  if (series.length < 7) {
    return { status: "unknown", ctl: 0, atl: 0, tsb: 0, ctlChange4w: 0, acwr: undefined };
  }
  const last = series.at(-1)!;
  const ctl = last.ctl;
  const atl = last.atl;
  const tsb = ctl - atl;
  const prev = series.at(-29) ?? series[0];
  const ctlChange4w = prev.ctl > 1 ? (ctl - prev.ctl) / prev.ctl : 0;

  const loadIn = (days: number, offset = 0) => {
    const from = now.getTime() - (days + offset) * DAY_MS;
    const to = now.getTime() - offset * DAY_MS;
    return runs
      .filter((r) => {
        const t = new Date(r.startTime).getTime();
        return t > from && t <= to;
      })
      .reduce((s, r) => s + runLoad(r, p), 0);
  };
  const acute = loadIn(7);
  const chronic = loadIn(28) / 4;
  const acwr = chronic > 10 ? acute / chronic : undefined;

  let status: FormStatus = "maintaining";
  if (tsb < -30 || (acwr !== undefined && acwr > 1.6)) status = "overload";
  else if (tsb > 12) status = "fresh";
  else if (ctlChange4w > 0.05) status = "building";
  else if (ctlChange4w < -0.12) status = "detraining";

  return { status, ctl, atl, tsb, ctlChange4w, acwr };
}

