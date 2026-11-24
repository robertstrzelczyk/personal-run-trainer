import { describe, expect, it } from "vitest";
import type { Profile } from "../types";
import { deloadUntilFromToday, isDeloadActive, recentAvgRpe } from "./deload";

const profile: Profile = {
  age: 35,
  sex: "male",
  maxHr: 185,
  restHr: 55,
  goal: "fitness",
  daysPerWeek: 4,
};

describe("deload", () => {
  it("detects active deload window", () => {
    const day = new Date("2026-06-15T12:00:00");
    expect(isDeloadActive({ ...profile, deloadUntil: "2026-06-15" }, day)).toBe(true);
    expect(isDeloadActive({ ...profile, deloadUntil: "2026-06-14" }, day)).toBe(false);
    expect(isDeloadActive(profile, day)).toBe(false);
  });

  it("averages recent RPE", () => {
    const day = new Date("2026-06-15T12:00:00.000Z");
    const starts = new Map([
      ["a", "2026-06-14T08:00:00.000Z"],
      ["b", "2026-06-13T08:00:00.000Z"],
    ]);
    expect(recentAvgRpe({ a: { rpe: 5 }, b: { rpe: 4 } }, starts, day)).toBe(4.5);
  });

  it("builds deload until date", () => {
    expect(deloadUntilFromToday(3, new Date("2026-06-15T12:00:00"))).toBe("2026-06-18");
  });
});
