import { describe, expect, it } from "vitest";
import type { Profile, RunSummary } from "../types";
import { FORM_LABELS, runLoad } from "./load";

const profile: Profile = {
  age: 35,
  sex: "male",
  maxHr: 185,
  restHr: 55,
  goal: "fitness",
  daysPerWeek: 4,
};

function sampleRun(partial?: Partial<RunSummary>): RunSummary {
  return {
    id: "r1",
    source: "garmin",
    sport: "running",
    startTime: "2026-01-01T08:00:00.000Z",
    distanceM: 5000,
    durationS: 1800,
    avgSpeed: 5000 / 1800,
    avgHr: 145,
    ...partial,
  };
}

describe("load", () => {
  it("computes positive TRIMP load", () => {
    expect(runLoad(sampleRun(), profile)).toBeGreaterThan(0);
  });

  it("exposes Polish form labels", () => {
    expect(FORM_LABELS.fresh).toBe("Zregenerowany");
    expect(FORM_LABELS.overload).toBe("Przeciążenie");
  });
});
