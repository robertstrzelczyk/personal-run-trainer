import { describe, expect, it } from "vitest";
import type { RaceEvent } from "../types";
import { daysToRaceDate, resolveRacePhase } from "./race-phase";

const race: RaceEvent = {
  id: "1",
  name: "Półmaraton Test",
  date: "2026-06-15",
  distance: "half",
  prepareForIt: true,
};

describe("race-phase", () => {
  it("counts days to race", () => {
    expect(daysToRaceDate("2026-06-15", new Date("2026-06-10T12:00:00"))).toBe(5);
    expect(daysToRaceDate("2026-06-15", new Date("2026-06-15T08:00:00"))).toBe(0);
    expect(daysToRaceDate("2026-06-15", new Date("2026-06-17T08:00:00"))).toBe(-2);
  });

  it("detects taper for half marathon within 14 days", () => {
    const info = resolveRacePhase(race, new Date("2026-06-08T12:00:00"));
    expect(info.phase).toBe("taper");
    expect(info.allowQuality).toBe(true);
    expect(info.volumeFactor).toBeLessThan(1);
  });

  it("marks race day", () => {
    const info = resolveRacePhase(race, new Date("2026-06-15T12:00:00"));
    expect(info.phase).toBe("race");
    expect(info.preferRest).toBe(true);
  });

  it("marks recovery after race", () => {
    const info = resolveRacePhase(race, new Date("2026-06-17T12:00:00"));
    expect(info.phase).toBe("recovery");
    expect(info.preferRest).toBe(true);
  });

  it("uses peak before taper window", () => {
    const info = resolveRacePhase(race, new Date("2026-05-20T12:00:00"));
    expect(info.phase).toBe("peak");
    expect(info.longFactor).toBeGreaterThan(1);
  });
});
