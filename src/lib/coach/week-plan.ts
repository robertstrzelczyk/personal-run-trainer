import type { FitnessSummary } from "../analytics/fitness";
import { startOfDay } from "../analytics/load";
import { DAY_MS } from "../analytics/physiology";
import type { Profile, RaceEvent, RunFeedback, RunSummary, WorkoutType } from "../types";
import { recommendForDay, type Recommendation } from "./recommend";

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

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Plan na kolejne 7 dni (dziś + 6), z recommendForDay. */
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

  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getTime() + i * DAY_MS);
    const recommendation = recommendForDay(runs, profile, fitness, date, races, feedback);
    const planned = recommendation.workout.totalM / 1000;
    if (recommendation.workout.type !== "rest") {
      plannedKm += planned;
      trainingDays += 1;
    }
    days.push({
      date,
      isoDate: toIsoLocal(date),
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
