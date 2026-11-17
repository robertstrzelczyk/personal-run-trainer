import { useMemo } from "react";
import { efficiencySummary } from "./analytics/efficiency";
import { fitnessSummary } from "./analytics/fitness";
import { formState, loadSeries, startOfDay } from "./analytics/load";
import { recommend, recommendTodayAndTomorrow } from "./coach/recommend";
import { runningOnly } from "./sport";
import type { Profile, RunSummary } from "./types";

export function useAnalysis(
  runs: RunSummary[],
  profile: Profile,
  vo2: Array<{ date: string; value: number }>,
) {
  return useMemo(() => {
    const now = new Date();
    const runOnly = runningOnly(runs);
    const fitness = fitnessSummary(runOnly, profile, vo2, now);
    const series = loadSeries(runOnly, profile, now);
    const form = formState(series, runOnly, profile, startOfDay(now));
    const efficiency = efficiencySummary(runOnly, profile, now);
    const recommendation = recommend(runOnly, profile, fitness, now);
    const schedule = recommendTodayAndTomorrow(runOnly, profile, fitness, now);
    return { fitness, form, series, efficiency, recommendation, schedule };
  }, [runs, profile, vo2]);
}
