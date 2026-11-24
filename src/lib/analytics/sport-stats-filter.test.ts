import { describe, expect, it } from "vitest";
import type { RunSummary } from "../types";
import {
  dailyDistanceSeries,
  sportFilterLabel,
  sportStatsForPeriod,
  totalForSportFilter,
} from "./sport-stats";

function run(sport: RunSummary["sport"], distanceM: number, daysAgo: number): RunSummary {
  const start = new Date("2026-06-15T12:00:00.000Z");
  start.setUTCDate(start.getUTCDate() - daysAgo);
  return {
    id: `${sport}-${daysAgo}`,
    source: "garmin",
    sport,
    startTime: start.toISOString(),
    distanceM,
    durationS: 1800,
    avgSpeed: distanceM / 1800,
  };
}

describe("sport filter summary", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");
  // daysAgo 0 = dziś (w oknie „ten tydzień” zaczynającym się w poniedziałek)
  const runs = [
    run("running", 10000, 0),
    run("walking", 5000, 0),
    run("cycling", 20000, 0),
  ];

  it("totals all vs single sport", () => {
    const stats = sportStatsForPeriod(runs, "week", now);
    expect(totalForSportFilter(stats, "all").distanceM).toBe(35000);
    expect(totalForSportFilter(stats, "running").distanceM).toBe(10000);
    expect(totalForSportFilter(stats, "walking").distanceM).toBe(5000);
    expect(sportFilterLabel("walking")).toMatch(/chodzenie/i);
  });

  it("filters daily series by sport", () => {
    const all = dailyDistanceSeries(runs, 7, now, "all");
    const walk = dailyDistanceSeries(runs, 7, now, "walking");
    expect(all.reduce((s, d) => s + d.distanceKm, 0)).toBeCloseTo(35, 5);
    expect(walk.reduce((s, d) => s + d.distanceKm, 0)).toBeCloseTo(5, 5);
  });
});
