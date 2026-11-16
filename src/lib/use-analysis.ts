"use client";

import { useMemo } from "react";
import { efficiencySummary } from "./analytics/efficiency";
import { fitnessSummary } from "./analytics/fitness";
import { formState, loadSeries, runLoad, startOfDay } from "./analytics/load";
import { DAY_MS } from "./analytics/physiology";
import { recommend } from "./coach/recommend";
import type { AppState } from "./store";

export interface WeekBucket {
  label: string;
  km: number;
  runs: number;
}

export function useAnalysis(state: AppState) {
  return useMemo(() => {
    if (!state.hydrated || state.runs.length === 0) return null;
    const now = new Date();
    const { runs, profile, garminVo2 } = state;
    const fitness = fitnessSummary(runs, profile, garminVo2, now);
    const efficiency = efficiencySummary(runs, profile, now);
    const series = loadSeries(runs, profile, now);
    const form = formState(series, runs, profile, now);
    const recommendation = recommend(runs, profile, fitness, now);

    const weeks: WeekBucket[] = [];
    const todayStart = startOfDay(now);
    const mondayOffset = (todayStart.getDay() + 6) % 7;
    const thisMonday = todayStart.getTime() - mondayOffset * DAY_MS;
    for (let i = 7; i >= 0; i--) {
      const from = thisMonday - i * 7 * DAY_MS;
      const to = from + 7 * DAY_MS;
      const inWeek = runs.filter((r) => {
        const t = new Date(r.startTime).getTime();
        return t >= from && t < to;
      });
      weeks.push({
        label: new Date(from).toLocaleDateString("pl-PL", { day: "numeric", month: "numeric" }),
        km: Math.round(inWeek.reduce((s, r) => s + r.distanceM, 0) / 100) / 10,
        runs: inWeek.length,
      });
    }

    const loads = new Map(runs.map((r) => [r.id, runLoad(r, profile)]));
    return { now, fitness, efficiency, series, form, recommendation, weeks, loads };
  }, [state]);
}

export type Analysis = NonNullable<ReturnType<typeof useAnalysis>>;
