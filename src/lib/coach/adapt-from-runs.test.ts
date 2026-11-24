import { describe, expect, it } from "vitest";
import type { Profile, RunSummary, Workout } from "../types";
import { computeExecutionAdaptation } from "./adapt-from-runs";

const profile: Profile = {
  age: 35,
  sex: "male",
  maxHr: 185,
  restHr: 55,
  goal: "10k",
  daysPerWeek: 4,
};

function workout(type: Workout["type"], totalM = 6000, totalS = 2400): Workout {
  return {
    type,
    title: type,
    summary: type,
    rationale: [],
    blocks: [],
    totalM,
    totalS,
  };
}

function run(daysAgo: number, avgHr: number, id: string): RunSummary {
  const start = new Date("2026-06-15T12:00:00.000Z");
  start.setUTCDate(start.getUTCDate() - daysAgo);
  return {
    id,
    source: "garmin",
    sport: "running",
    startTime: start.toISOString(),
    distanceM: 6000,
    durationS: 2400,
    avgSpeed: 6000 / 2400,
    avgHr,
  };
}

describe("computeExecutionAdaptation", () => {
  const day = new Date("2026-06-15T12:00:00.000Z");

  it("suppresses quality after skipped quality day", () => {
    const runs = [run(3, 140, "a"), run(5, 140, "b")];
    const adapt = computeExecutionAdaptation(runs, profile, day, (past) => {
      const ago = Math.round((day.getTime() - past.getTime()) / 86_400_000);
      return ago === 2 ? workout("tempo") : workout("easy");
    });
    expect(adapt.suppressQuality).toBe(true);
    expect(adapt.reasons.some((r) => /jakościowy/i.test(r))).toBe(true);
  });

  it("softens after too-hard easy days", () => {
    const runs = [run(1, 170, "h1"), run(2, 172, "h2"), run(4, 140, "e")];
    const adapt = computeExecutionAdaptation(runs, profile, day, () => workout("easy"));
    expect(adapt.preferRecovery || adapt.suppressQuality || adapt.volumeScale < 1).toBe(true);
    expect(adapt.volumeScale).toBeLessThanOrEqual(0.92);
  });

  it("notes good adherence streak", () => {
    const runs = [1, 2, 3, 4, 5, 6, 7].map((d) => run(d, 135, `r${d}`));
    const adapt = computeExecutionAdaptation(runs, profile, day, () => workout("easy"));
    expect(adapt.suppressQuality).toBe(false);
    expect(adapt.volumeScale).toBe(1);
    expect(adapt.reasons.some((r) => /rytm/i.test(r))).toBe(true);
  });
});
