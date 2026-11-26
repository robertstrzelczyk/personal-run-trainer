import { useMemo } from "react";
import { efficiencySummary } from "./analytics/efficiency";
import { fitnessSummary } from "./analytics/fitness";
import { addLocalDays, dayKey, formState, loadSeries, startOfDay } from "./analytics/load";
import { comparePlanToRuns } from "./coach/adherence";
import { buildRaceBlockPlan } from "./coach/block-plan";
import { isDeloadActive } from "./coach/deload";
import { recommendTodayAndTomorrow } from "./coach/recommend";
import { activeRace, resolveRacePhase } from "./coach/race-phase";
import { buildWeekPlan } from "./coach/week-plan";
import { runningOnly } from "./sport";
import type { Profile, RaceEvent, RunFeedback, RunSummary } from "./types";

export type AnalysisOptions = {
  /** plan 7 dni (domyślnie true) */
  week?: boolean;
  /** pełny plan blokowy — kosztowny; tylko ekran /plan */
  block?: boolean;
};

/**
 * Analiza formy / planu. Forma = TSB „rano” (seria do wczoraj), spójnie z coach.
 * Block plan tylko gdy options.block === true.
 */
export function useAnalysis(
  runs: RunSummary[],
  profile: Profile,
  vo2: Array<{ date: string; value: number }>,
  races: RaceEvent[] = [],
  feedback: Record<string, RunFeedback> = {},
  options: AnalysisOptions = {},
) {
  const includeWeek = options.week !== false;
  const includeBlock = options.block === true;
  const localDay = dayKey(new Date());

  return useMemo(() => {
    const now = new Date();
    const runOnly = runningOnly(runs);
    const fitness = fitnessSummary(runOnly, profile, vo2, now);
    // Seria do wczoraj → forma „dziś rano” (jak w recommendForDay)
    const morningSeries = loadSeries(runOnly, profile, addLocalDays(now, -1));
    const form = formState(morningSeries, runOnly, profile, startOfDay(now));
    // Pełna seria do dziś — wykresy CTL/ATL
    const series = loadSeries(runOnly, profile, now);
    const efficiency = efficiencySummary(runOnly, profile, now);
    const schedule = recommendTodayAndTomorrow(runOnly, profile, fitness, now, races, feedback);
    const weekPlan = includeWeek
      ? buildWeekPlan(runOnly, profile, fitness, now, races, feedback)
      : {
          days: [],
          plannedKm: 0,
          trainingDays: 0,
          daysPerWeekTarget: profile.daysPerWeek,
        };
    const blockPlan = includeBlock
      ? buildRaceBlockPlan(runOnly, profile, fitness, now, races, feedback)
      : undefined;
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
      schedule,
      weekPlan,
      blockPlan,
      todayAdherence,
      racePhase,
      preparing,
      deload,
    };
  }, [runs, profile, vo2, races, feedback, includeWeek, includeBlock, localDay]);
}
