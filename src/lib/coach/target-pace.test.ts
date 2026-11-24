import { describe, expect, it } from "vitest";
import type { RaceEvent } from "../types";
import { assessRaceTarget, reorderQualityRotation } from "./target-pace";

const race = (targetTimeS: number): RaceEvent => ({
  id: "r1",
  name: "Test Half",
  date: "2026-09-01",
  distance: "half",
  targetTimeS,
  prepareForIt: true,
});

describe("assessRaceTarget", () => {
  it("returns undefined without target time", () => {
    expect(
      assessRaceTarget(
        { ...race(5400), targetTimeS: undefined },
        45,
      ),
    ).toBeUndefined();
  });

  it("flags ambitious goals vs current VDOT", () => {
    // ~1:20 half is strong — much harder than VDOT 40
    const a = assessRaceTarget(race(80 * 60), 40);
    expect(a).toBeDefined();
    expect(["ambitious", "stretch"]).toContain(a!.difficulty);
    expect(a!.label).toMatch(/ambitny/);
  });

  it("flags easy goals when target is slower than fitness", () => {
    // 2:15 half with VDOT 50 is easy
    const a = assessRaceTarget(race(135 * 60), 50);
    expect(a!.difficulty).toBe("easy");
    expect(a!.label).toBe("cel łatwy");
  });

  it("marks realistic mid-range targets", () => {
    const a = assessRaceTarget(race(105 * 60), 42);
    expect(a!.difficulty).toBe("realistic");
  });
});

describe("reorderQualityRotation", () => {
  it("puts preferred qualities first", () => {
    expect(reorderQualityRotation(["a", "b", "c", "d"], ["c", "a"])).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });
});
