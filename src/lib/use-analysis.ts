import { useMemo } from "react";
import { efficiencySummary } from "./analytics/efficiency";
import { fitnessSummary } from "./analytics/fitness";
import { formState, loadSeries, startOfDay } from "./analytics/load";
import { comparePlanToRuns } from "./coach/adherence";
import { buildRaceBlockPlan } from "./coach/block-plan";
import { isDeloadActive } from "./coach/deload";
import { recommend, recommendTodayAndTomorrow } from "./coach/recommend";
import { activeRace, resolveRacePhase } from "./coach/race-phase";
import { buildWeekPlan } from "./coach/week-plan";
import { runningOnly } from "./sport";
import type { Profile, RaceEvent, RunFeedback, RunSummary } from "./types";

export function useAnalysis(
  runs: RunSummary[],
  profile: Profile,
  vo2: Array<{ date: string; value: number }>,
  races: RaceEvent[] = [],
  feedback: Record<string, RunFeedback> = {},
) {
  return useMemo(() => {
    const now = new Date();
    const runOnly = runningOnly(runs);
    const fitness = fitnessSummary(runOnly, profile, vo2, now);
    const series = loadSeries(runOnly, profile, now);
    const form = formState(series, runOnly, profile, startOfDay(now));
    const efficiency = efficiencySummary(runOnly, profile, now);
    const recommendation = recommend(runOnly, profile, fitness, now, races, feedback);
    const schedule = recommendTodayAndTomorrow(runOnly, profile, fitness, now, races, feedback);
    const weekPlan = buildWeekPlan(runOnly, profile, fitness, now, races, feedback);
    const blockPlan = buildRaceBlockPlan(runOnly, profile, fitness, now, races);
    const todayAdherence = comparePlanToRuns(
      schedule.today.workout,
      runOnly,
      now,
      profile,
    );
    const preparing = activeRace(races);
    const racePhase = preparing ? resolveRacePhase(preparing, now) : undefined;
    const deload = isDeloadActive(profile, now);
    return {
      fitness,
      form,
      series,
      efficiency,
      recommendation,
      schedule,
      weekPlan,
      blockPlan,
      todayAdherence,
      racePhase,
      preparing,
      deload,
    };
  }, [runs, profile, vo2, races, feedback]);
}
