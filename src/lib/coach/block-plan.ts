import type { FitnessSummary } from "../analytics/fitness";
import { addLocalDays, startOfDay, toIsoLocal } from "../analytics/load";
import type { Profile, RaceEvent, RunFeedback, RunSummary, WorkoutType } from "../types";
import { activeRace, daysToRaceDate, resolveRacePhase, type RacePhase } from "./race-phase";
import { isQualityWorkoutType, recommendForDay } from "./recommend";

export interface BlockPlanDay {
  date: Date;
  isoDate: string;
  workoutType: WorkoutType;
  title: string;
  plannedKm: number;
  phase: RacePhase;
  phaseLabel: string;
}

export interface BlockPlanWeek {
  weekIndex: number;
  from: Date;
  to: Date;
  phase: RacePhase;
  phaseLabel: string;
  plannedKm: number;
  trainingDays: number;
  days: BlockPlanDay[];
}

export interface BlockPlan {
  race: RaceEvent;
  daysToRace: number;
  weeks: BlockPlanWeek[];
  totalKm: number;
  totalTrainingDays: number;
}

const BLOCK_WEEKS: Record<string, number> = {
  "5k": 8,
  "10k": 10,
  half: 12,
  marathon: 16,
};

/**
 * Plan blokowy do aktywnego startu (max 8–16 tyg.).
 * Sekwencyjny, bez adaptacji na dniach przyszłych (adapt tylko dziś).
 */
export function buildRaceBlockPlan(
  runs: RunSummary[],
  profile: Profile,
  fitness: FitnessSummary,
  now: Date = new Date(),
  races: RaceEvent[] = [],
  feedback: Record<string, RunFeedback> = {},
): BlockPlan | undefined {
  const race = activeRace(races);
  if (!race) return undefined;
  const today = startOfDay(now);
  const daysToRace = daysToRaceDate(race.date, today);
  if (daysToRace < 0) return undefined;

  const maxWeeks = BLOCK_WEEKS[race.distance] ?? 12;
  const maxDays = Math.min(daysToRace + 1, maxWeeks * 7);
  const days: BlockPlanDay[] = [];
  let totalKm = 0;
  let totalTrainingDays = 0;
  const plannedHardIsos: string[] = [];
  const plannedLongIsos: string[] = [];

  for (let i = 0; i < maxDays; i++) {
    const date = addLocalDays(today, i);
    const phaseInfo = resolveRacePhase(race, date);
    if (phaseInfo.phase === "done") break;
    const rec = recommendForDay(runs, profile, fitness, date, races, feedback, {
      adapt: i === 0,
      asOf: today,
      plannedHardIsos: [...plannedHardIsos],
      plannedLongIsos: [...plannedLongIsos],
    });
    const plannedKm = rec.workout.type === "rest" ? 0 : rec.workout.totalM / 1000;
    if (rec.workout.type !== "rest") {
      totalKm += plannedKm;
      totalTrainingDays += 1;
    }
    const iso = toIsoLocal(date);
    if (isQualityWorkoutType(rec.workout.type)) plannedHardIsos.push(iso);
    if (rec.workout.type === "long") plannedLongIsos.push(iso);

    days.push({
      date,
      isoDate: iso,
      workoutType: rec.workout.type,
      title: rec.workout.title,
      plannedKm,
      phase: phaseInfo.phase,
      phaseLabel: phaseInfo.phaseLabel,
    });
  }

  const weeks: BlockPlanWeek[] = [];
  for (let w = 0; w * 7 < days.length; w++) {
    const slice = days.slice(w * 7, w * 7 + 7);
    if (!slice.length) break;
    const phaseCounts = new Map<RacePhase, number>();
    for (const d of slice) phaseCounts.set(d.phase, (phaseCounts.get(d.phase) ?? 0) + 1);
    let dominant: RacePhase = slice[0]!.phase;
    let best = 0;
    for (const [p, c] of phaseCounts) {
      if (c > best) {
        best = c;
        dominant = p;
      }
    }
    weeks.push({
      weekIndex: w + 1,
      from: slice[0]!.date,
      to: slice[slice.length - 1]!.date,
      phase: dominant,
      phaseLabel: slice.find((d) => d.phase === dominant)?.phaseLabel ?? dominant,
      plannedKm: slice.reduce((s, d) => s + d.plannedKm, 0),
      trainingDays: slice.filter((d) => d.workoutType !== "rest").length,
      days: slice,
    });
  }

  return { race, daysToRace, weeks, totalKm, totalTrainingDays };
}
