import type { Profile, RunSummary } from "../types";

export type HrZoneId = 1 | 2 | 3 | 4 | 5;

export interface HrZoneDef {
  id: HrZoneId;
  label: string;
  /** inclusive lower bound as fraction of maxHr */
  lowFrac: number;
  /** exclusive upper bound as fraction of maxHr (Z5 uses 2) */
  highFrac: number;
  color: string;
}

/** Klasyczne strefy %HRmax (Garmin-like). */
export const HR_ZONE_DEFS: HrZoneDef[] = [
  { id: 1, label: "Rozgrzewka", lowFrac: 0, highFrac: 0.6, color: "#5b8def" },
  { id: 2, label: "Łatwy", lowFrac: 0.6, highFrac: 0.7, color: "#3ecf8e" },
  { id: 3, label: "Tlenowy", lowFrac: 0.7, highFrac: 0.8, color: "#f0b429" },
  { id: 4, label: "Próg", lowFrac: 0.8, highFrac: 0.9, color: "#f79009" },
  { id: 5, label: "Maksimum", lowFrac: 0.9, highFrac: 2, color: "#f97066" },
];

export interface HrZoneSlice {
  id: HrZoneId;
  label: string;
  color: string;
  seconds: number;
  percent: number;
  bpmLow: number;
  bpmHigh: number;
}

export function zoneForBpm(bpm: number, maxHr: number): HrZoneId {
  const frac = bpm / maxHr;
  for (const z of HR_ZONE_DEFS) {
    if (frac >= z.lowFrac && frac < z.highFrac) return z.id;
  }
  return 5;
}

export function minHrFromHist(hrHist: Record<string, number> | undefined): number | undefined {
  if (!hrHist) return undefined;
  const bpms = Object.keys(hrHist)
    .map(Number)
    .filter((b) => b > 30 && (hrHist[String(b)] ?? 0) > 0);
  if (!bpms.length) return undefined;
  return Math.min(...bpms);
}

export function analyzeHrZones(
  hrHist: Record<string, number> | undefined,
  maxHr: number,
): HrZoneSlice[] {
  const totals = new Map<HrZoneId, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ]);
  let total = 0;
  if (hrHist) {
    for (const [bpmStr, seconds] of Object.entries(hrHist)) {
      const bpm = Number(bpmStr);
      if (!bpm || seconds <= 0) continue;
      const id = zoneForBpm(bpm, maxHr);
      totals.set(id, (totals.get(id) ?? 0) + seconds);
      total += seconds;
    }
  }

  return HR_ZONE_DEFS.map((z) => {
    const seconds = totals.get(z.id) ?? 0;
    const bpmLow = Math.round(z.lowFrac * maxHr);
    const bpmHigh = z.id === 5 ? maxHr : Math.round(z.highFrac * maxHr) - 1;
    return {
      id: z.id,
      label: z.label,
      color: z.color,
      seconds,
      percent: total > 0 ? (seconds / total) * 100 : 0,
      bpmLow,
      bpmHigh: Math.max(bpmLow, bpmHigh),
    };
  });
}

export function runHrStats(run: RunSummary, profile: Pick<Profile, "maxHr">) {
  return {
    avgHr: run.avgHr,
    maxHr: run.maxHr,
    minHr: minHrFromHist(run.hrHist),
    zones: analyzeHrZones(run.hrHist, profile.maxHr),
  };
}

export function formatZoneMinutes(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m} min ${s} s` : `${m} min`;
}
