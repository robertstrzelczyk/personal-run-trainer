import { useMemo } from "react";
import { efficiencySummary } from "./analytics/efficiency";
import { fitnessSummary } from "./analytics/fitness";
import { formState, loadSeries, startOfDay } from "./analytics/load";
import { recommend } from "./coach/recommend";
import type { Profile, RunSummary } from "./types";

export function useAnalysis(
  runs: RunSummary[],
  profile: Profile,
  vo2: Array<{ date: string; value: number }>,
) {
  return useMemo(() => {
    const now = new Date();
    const fitness = fitnessSummary(runs, profile, vo2, now);
    const series = loadSeries(runs, profile, now);
    const form = formState(series, runs, profile, startOfDay(now));
    const efficiency = efficiencySummary(runs, profile, now);
    const recommendation = recommend(runs, profile, fitness, now);
    return { fitness, form, series, efficiency, recommendation };
  }, [runs, profile, vo2]);
}
