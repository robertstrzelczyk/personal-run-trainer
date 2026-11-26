import type { FitnessSummary } from "../analytics/fitness";
import { addLocalDays, startOfDay, toIsoLocal } from "../analytics/load";
import type { Profile, RaceEvent, RunFeedback, RunSummary, WorkoutType } from "../types";
import { isQualityWorkoutType, recommendForDay, type Recommendation } from "./recommend";

export interface WeekDayPlan {
  date: Date;
  isoDate: string;
  isToday: boolean;
  recommendation: Recommendation;
  workoutType: WorkoutType;
  title: string;
  plannedKm: number;
}

export interface WeekPlan {
  days: WeekDayPlan[];
  plannedKm: number;
  trainingDays: number;
  daysPerWeekTarget: number;
}

/** Plan na kolejne 7 dni (dziś + 6), sekwencyjnie z spacingiem jakości/long. */
export function buildWeekPlan(
  runs: RunSummary[],
  profile: Profile,
  fitness: FitnessSummary,
  now: Date = new Date(),
  races: RaceEvent[] = [],
  feedback: Record<string, RunFeedback> = {},
): WeekPlan {
  const today = startOfDay(now);
  const days: WeekDayPlan[] = [];
  let plannedKm = 0;
  let trainingDays = 0;
  const plannedHardIsos: string[] = [];
  const plannedLongIsos: string[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addLocalDays(today, i);
    const recommendation = recommendForDay(runs, profile, fitness, date, races, feedback, {
      adapt: i === 0,
      asOf: today,
      plannedHardIsos: [...plannedHardIsos],
      plannedLongIsos: [...plannedLongIsos],
    });
    const planned = recommendation.workout.totalM / 1000;
    if (recommendation.workout.type !== "rest") {
      plannedKm += planned;
      trainingDays += 1;
    }
    const iso = toIsoLocal(date);
    if (isQualityWorkoutType(recommendation.workout.type)) plannedHardIsos.push(iso);
    if (recommendation.workout.type === "long") plannedLongIsos.push(iso);

    days.push({
      date,
      isoDate: iso,
      isToday: i === 0,
      recommendation,
      workoutType: recommendation.workout.type,
      title: recommendation.workout.title,
      plannedKm: planned,
    });
  }

  return {
    days,
    plannedKm,
    trainingDays,
    daysPerWeekTarget: profile.daysPerWeek,
  };
}
