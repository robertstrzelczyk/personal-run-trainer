import { describe, expect, it } from "vitest";
import type { Workout } from "../types";
import { describeDuration, describeTarget, workoutToText } from "./describe";

describe("describe", () => {
  it("describes duration and targets in Polish", () => {
    expect(describeDuration({ kind: "easy", label: "Bieg", durationS: 600 })).toBe("10 min");
    expect(describeDuration({ kind: "work", label: "Odcinek", distanceM: 400 })).toBe("400 m");
    expect(
      describeTarget({ kind: "work", label: "Tempo", paceFast: 300, paceSlow: 330, hrLow: 150, hrHigh: 165 }),
    ).toContain("tętno 150–165");
  });

  it("renders workout text", () => {
    const workout: Workout = {
      type: "easy",
      title: "Spokojny bieg",
      summary: "Łatwy trening",
      rationale: ["Regeneracja"],
      blocks: [{ type: "step", step: { kind: "easy", label: "Bieg", durationS: 1800 } }],
      totalS: 1800,
      totalM: 5000,
    };
    expect(workoutToText(workout)).toContain("Spokojny bieg");
    expect(workoutToText(workout)).toContain("Bieg");
  });
});
