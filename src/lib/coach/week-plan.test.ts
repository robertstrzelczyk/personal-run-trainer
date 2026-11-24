import { describe, expect, it } from "vitest";
import { fitnessSummary } from "../analytics/fitness";
import type { Profile, RunSummary } from "../types";
import { buildWeekPlan } from "./week-plan";

const profile: Profile = {
  age: 35,
  sex: "male",
  maxHr: 185,
  restHr: 55,
  goal: "fitness",
  daysPerWeek: 4,
};

function makeRun(daysAgo: number, id: string): RunSummary {
  const start = new Date("2026-06-15T12:00:00.000Z");
  start.setUTCDate(start.getUTCDate() - daysAgo);
  return {
    id,
    source: "garmin",
    sport: "running",
    startTime: start.toISOString(),
    distanceM: 6000,
    durationS: 2100,
    avgSpeed: 6000 / 2100,
    avgHr: 140,
  };
}

describe("buildWeekPlan", () => {
  it("returns 7 days starting today", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const runs = [makeRun(1, "a"), makeRun(3, "b"), makeRun(5, "c"), makeRun(7, "d")];
    const fitness = fitnessSummary(runs, profile, [], now);
    const plan = buildWeekPlan(runs, profile, fitness, now);
    expect(plan.days).toHaveLength(7);
    expect(plan.days[0].isToday).toBe(true);
    expect(plan.daysPerWeekTarget).toBe(4);
    expect(plan.days.every((d) => d.title)).toBe(true);
  });
});
