import { describe, expect, it } from "vitest";
import type { Profile, RunSummary, Workout } from "../types";
import { comparePlanToRuns } from "./adherence";

const profile: Profile = {
  age: 35,
  sex: "male",
  maxHr: 185,
  restHr: 55,
  goal: "10k",
  daysPerWeek: 4,
};

const day = new Date("2026-06-15T12:00:00.000Z");

function workout(partial: Partial<Workout> & Pick<Workout, "type" | "title">): Workout {
  return {
    summary: "test",
    rationale: [],
    blocks: [],
    totalS: 2400,
    totalM: 6000,
    ...partial,
  };
}

function run(opts: Partial<RunSummary> & { avgHr?: number; durationS?: number }): RunSummary {
  return {
    id: opts.id ?? "r1",
    source: "garmin",
    sport: "running",
    startTime: opts.startTime ?? "2026-06-15T08:00:00.000Z",
    distanceM: opts.distanceM ?? 6000,
    durationS: opts.durationS ?? 2400,
    avgSpeed: (opts.distanceM ?? 6000) / (opts.durationS ?? 2400),
    avgHr: opts.avgHr,
  };
}

describe("comparePlanToRuns", () => {
  it("marks rest as ok when no run", () => {
    const r = comparePlanToRuns(workout({ type: "rest", title: "Rest", totalS: 0, totalM: 0 }), [], day, profile);
    expect(r.status).toBe("rest_ok");
  });

  it("marks skipped when plan expects a run", () => {
    const r = comparePlanToRuns(workout({ type: "easy", title: "Easy" }), [], day, profile);
    expect(r.status).toBe("skipped");
  });

  it("matches easy run with similar volume and easy HR", () => {
    const r = comparePlanToRuns(
      workout({ type: "easy", title: "Easy" }),
      [run({ avgHr: 135, durationS: 2400, distanceM: 6000 })],
      day,
      profile,
    );
    expect(r.status).toBe("matched");
  });

  it("flags too hard when easy plan got high HR", () => {
    const r = comparePlanToRuns(
      workout({ type: "easy", title: "Easy" }),
      [run({ avgHr: 170, durationS: 2400, distanceM: 6000 })],
      day,
      profile,
    );
    expect(r.status).toBe("too_hard");
  });

  it("matches quality when hard effort present", () => {
    const r = comparePlanToRuns(
      workout({ type: "tempo", title: "Tempo", totalS: 3000, totalM: 8000 }),
      [run({ avgHr: 168, durationS: 2800, distanceM: 7500 })],
      day,
      profile,
    );
    expect(r.status).toBe("matched");
  });
});
