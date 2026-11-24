import { useMemo } from "react";
import { efficiencySummary } from "./analytics/efficiency";
import { fitnessSummary } from "./analytics/fitness";
import { formState, loadSeries, startOfDay } from "./analytics/load";
import { comparePlanToRuns } from "./coach/adherence";
import { recommend, recommendTodayAndTomorrow } from "./coach/recommend";
import { activeRace, resolveRacePhase } from "./coach/race-phase";
import { buildWeekPlan } from "./coach/week-plan";
import { runningOnly } from "./sport";
import type { Profile, RaceEvent, RunSummary } from "./types";

export function useAnalysis(
  runs: RunSummary[],
  profile: Profile,
  vo2: Array<{ date: string; value: number }>,
  races: RaceEvent[] = [],
) {
  return useMemo(() => {
    const now = new Date();
    const runOnly = runningOnly(runs);
    const fitness = fitnessSummary(runOnly, profile, vo2, now);
    const series = loadSeries(runOnly, profile, now);
    const form = formState(series, runOnly, profile, startOfDay(now));
    const efficiency = efficiencySummary(runOnly, profile, now);
    const recommendation = recommend(runOnly, profile, fitness, now, races);
    const schedule = recommendTodayAndTomorrow(runOnly, profile, fitness, now, races);
    const weekPlan = buildWeekPlan(runOnly, profile, fitness, now, races);
    const todayAdherence = comparePlanToRuns(
      schedule.today.workout,
      runOnly,
      now,
      profile,
    );
    const preparing = activeRace(races);
    const racePhase = preparing ? resolveRacePhase(preparing, now) : undefined;
    return {
      fitness,
      form,
      series,
      efficiency,
      recommendation,
      schedule,
      weekPlan,
      todayAdherence,
      racePhase,
      preparing,
    };
  }, [runs, profile, vo2, races]);
}
