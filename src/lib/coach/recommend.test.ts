import { describe, expect, it } from "vitest";
import type { Profile, RaceEvent, RunSummary } from "../types";
import { fitnessSummary } from "../analytics/fitness";
import { recommend, recommendForDay, recommendTodayAndTomorrow } from "./recommend";

const profile: Profile = {
  age: 35,
  sex: "male",
  maxHr: 185,
  restHr: 55,
  goal: "fitness",
  daysPerWeek: 4,
};

function makeRun(
  daysAgo: number,
  id: string,
  opts?: Partial<Pick<RunSummary, "durationS" | "distanceM" | "avgHr">>,
): RunSummary {
  const start = new Date("2026-06-15T12:00:00.000Z");
  start.setUTCDate(start.getUTCDate() - daysAgo);
  const durationS = opts?.durationS ?? 2100;
  const distanceM = opts?.distanceM ?? 6000;
  return {
    id,
    source: "garmin",
    sport: "running",
    startTime: start.toISOString(),
    distanceM,
    durationS,
    avgSpeed: distanceM / durationS,
    avgHr: opts?.avgHr ?? 140,
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

  it("prefers full rest after a very long run yesterday", () => {
    const runs = [
      makeRun(1, "long", { durationS: 100 * 60, distanceM: 18000, avgHr: 145 }),
      makeRun(3, "b"),
      makeRun(5, "c"),
      makeRun(7, "d"),
    ];
    const fitness = fitnessSummary(runs, profile, [], now);
    const rec = recommendForDay(runs, profile, fitness, now);
    expect(rec.workout.type).toBe("rest");
    expect(rec.alternative?.type).toBe("recovery");
  });

  it("suggests rest on race day when preparing for a race", () => {
    const runs = [makeRun(2, "a"), makeRun(4, "b"), makeRun(6, "c"), makeRun(8, "d")];
    const fitness = fitnessSummary(runs, profile, [], now);
    const races: RaceEvent[] = [
      {
        id: "r1",
        name: "Półmaraton",
        date: "2026-06-15",
        distance: "half",
        prepareForIt: true,
      },
    ];
    const rec = recommendForDay(runs, profile, fitness, now, races);
    expect(rec.workout.type).toBe("rest");
    expect(rec.racePhase?.phase).toBe("race");
  });

  it("includes target time assessment in rationale when preparing", () => {
    const runs = [makeRun(2, "a"), makeRun(4, "b"), makeRun(6, "c"), makeRun(8, "d")];
    const fitness = fitnessSummary(runs, profile, [], now);
    const races: RaceEvent[] = [
      {
        id: "r1",
        name: "Półmaraton",
        date: "2026-08-01",
        distance: "half",
        targetTimeS: 105 * 60,
        prepareForIt: true,
      },
    ];
    const rec = recommendForDay(runs, profile, fitness, now, races);
    expect(rec.targetAssessment).toBeDefined();
    expect(rec.workout.rationale.some((r) => /cel/i.test(r))).toBe(true);
  });
});
