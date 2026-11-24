import { DAY_MS } from "../analytics/physiology";
import { startOfDay } from "../analytics/load";
import type { Goal, RaceDistance, RaceEvent } from "../types";

export type RacePhase = "build" | "peak" | "taper" | "race" | "recovery" | "done";

export interface RacePhaseInfo {
  race: RaceEvent;
  /** dni do startu; ujemne = po starcie */
  daysToRace: number;
  phase: RacePhase;
  /** etykieta PL do UI */
  phaseLabel: string;
  /** mnożnik objętości easy/long (1 = normalnie) */
  volumeFactor: number;
  /** czy pozwalać na jakość (tempo/interwały) */
  allowQuality: boolean;
  /** czy obniżać long / skipować long */
  longFactor: number;
  /** preferuj pełny rest zamiast recovery po dużym wysiłku */
  preferRest: boolean;
  /** goal używany przez rotację jakości / long cap */
  effectiveGoal: Goal;
}

const TAPER_DAYS: Record<RaceDistance, number> = {
  "5k": 7,
  "10k": 10,
  half: 14,
  marathon: 21,
};

const PEAK_DAYS: Record<RaceDistance, number> = {
  "5k": 14,
  "10k": 21,
  half: 28,
  marathon: 35,
};

const RECOVERY_DAYS: Record<RaceDistance, number> = {
  "5k": 2,
  "10k": 3,
  half: 5,
  marathon: 7,
};

export function raceDistanceLabel(d: RaceDistance): string {
  return {
    "5k": "5 km",
    "10k": "10 km",
    half: "półmaraton",
    marathon: "maraton",
  }[d];
}

export function racePhaseLabel(phase: RacePhase): string {
  return {
    build: "Budowa",
    peak: "Peak",
    taper: "Taper",
    race: "Dzień startu",
    recovery: "Regeneracja po starcie",
    done: "Po starcie",
  }[phase];
}

export function activeRace(races: RaceEvent[]): RaceEvent | undefined {
  return races.find((r) => r.prepareForIt);
}

export function daysToRaceDate(raceDate: string, day: Date): number {
  const race = startOfDay(parseRaceDate(raceDate));
  const cur = startOfDay(day);
  return Math.round((race.getTime() - cur.getTime()) / DAY_MS);
}

export function parseRaceDate(isoDate: string): Date {
  // YYYY-MM-DD → lokalne południe, żeby uniknąć przesunięć TZ
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function resolveRacePhase(race: RaceEvent, day: Date): RacePhaseInfo {
  const daysToRace = daysToRaceDate(race.date, day);
  const taperLen = TAPER_DAYS[race.distance];
  const peakLen = PEAK_DAYS[race.distance];
  const recoveryLen = RECOVERY_DAYS[race.distance];
  const effectiveGoal: Goal = race.distance;

  let phase: RacePhase;
  if (daysToRace === 0) phase = "race";
  else if (daysToRace < 0 && daysToRace >= -recoveryLen) phase = "recovery";
  else if (daysToRace < -recoveryLen) phase = "done";
  else if (daysToRace > 0 && daysToRace <= taperLen) phase = "taper";
  else if (daysToRace > taperLen && daysToRace <= taperLen + peakLen) phase = "peak";
  else phase = "build";

  const base: Omit<RacePhaseInfo, "phase" | "phaseLabel" | "volumeFactor" | "allowQuality" | "longFactor" | "preferRest"> =
    { race, daysToRace, effectiveGoal };

  if (phase === "race") {
    return {
      ...base,
      phase,
      phaseLabel: racePhaseLabel(phase),
      volumeFactor: 0,
      allowQuality: false,
      longFactor: 0,
      preferRest: true,
    };
  }
  if (phase === "recovery") {
    return {
      ...base,
      phase,
      phaseLabel: racePhaseLabel(phase),
      volumeFactor: 0.5,
      allowQuality: false,
      longFactor: 0,
      preferRest: true,
    };
  }
  if (phase === "done") {
    return {
      ...base,
      phase,
      phaseLabel: racePhaseLabel(phase),
      volumeFactor: 1,
      allowQuality: true,
      longFactor: 1,
      preferRest: false,
    };
  }
  if (phase === "taper") {
    const progress = 1 - daysToRace / taperLen; // 0 na początku taperu → 1 w dniu przed startem
    const volumeFactor = clamp(0.85 - progress * 0.35, 0.45, 0.85);
    return {
      ...base,
      phase,
      phaseLabel: racePhaseLabel(phase),
      volumeFactor,
      allowQuality: daysToRace >= 4,
      longFactor: clamp(0.7 - progress * 0.4, 0.3, 0.7),
      preferRest: daysToRace <= 2,
    };
  }
  if (phase === "peak") {
    return {
      ...base,
      phase,
      phaseLabel: racePhaseLabel(phase),
      volumeFactor: 1.05,
      allowQuality: true,
      longFactor: 1.1,
      preferRest: false,
    };
  }
  return {
    ...base,
    phase,
    phaseLabel: racePhaseLabel(phase),
    volumeFactor: 1,
    allowQuality: true,
    longFactor: 1,
    preferRest: false,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function formatCountdown(daysToRace: number): string {
  if (daysToRace === 0) return "Dziś start!";
  if (daysToRace === 1) return "Jutro start";
  if (daysToRace > 1) return `Za ${daysToRace} dni`;
  if (daysToRace === -1) return "Wczoraj był start";
  return `${Math.abs(daysToRace)} dni po starcie`;
}
