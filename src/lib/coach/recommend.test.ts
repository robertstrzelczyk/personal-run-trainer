import { describe, expect, it } from "vitest";
import type { Profile, RunSummary } from "../types";
import { fitnessSummary } from "../analytics/fitness";
import { recommend, recommendTodayAndTomorrow } from "./recommend";

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

describe("recommend", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("recommends for today when no run today", () => {
    const runs = [makeRun(1, "a"), makeRun(3, "b"), makeRun(5, "c")];
    const fitness = fitnessSummary(runs, profile, [], now);
    const rec = recommend(runs, profile, fitness, now);
    expect(rec.forTomorrow).toBe(false);
  });

  it("switches to tomorrow after a run today", () => {
    const runs = [makeRun(0, "today"), makeRun(2, "b"), makeRun(4, "c")];
    const fitness = fitnessSummary(runs, profile, [], now);
    const rec = recommend(runs, profile, fitness, now);
    expect(rec.forTomorrow).toBe(true);
  });

  it("returns both today and tomorrow plans", () => {
    const runs = [makeRun(1, "a"), makeRun(3, "b"), makeRun(5, "c")];
    const fitness = fitnessSummary(runs, profile, [], now);
    const schedule = recommendTodayAndTomorrow(runs, profile, fitness, now);
    expect(schedule.today.forTomorrow).toBe(false);
    expect(schedule.tomorrow.forTomorrow).toBe(true);
    expect(schedule.today.workout.title).toBeTruthy();
    expect(schedule.tomorrow.workout.title).toBeTruthy();
  });
});
