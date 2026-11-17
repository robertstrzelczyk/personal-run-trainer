import { describe, expect, it } from "vitest";
import type { RunSummary } from "../types";
import { distanceBySport, formatKm, sportStatsForPeriod } from "./sport-stats";

function run(
  sport: RunSummary["sport"],
  distanceM: number,
  startTime: string,
): RunSummary {
  return {
    id: `${sport}-${startTime}`,
    source: "garmin",
    sport,
    startTime,
    distanceM,
    durationS: 1800,
    avgSpeed: distanceM / 1800,
  };
}

describe("sport-stats", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");
  const runs: RunSummary[] = [
    run("running", 10_000, "2026-06-15T08:00:00.000Z"),
    run("walking", 3_000, "2026-06-14T08:00:00.000Z"),
    run("cycling", 25_000, "2026-06-10T08:00:00.000Z"),
    run("running", 5_000, "2025-12-01T08:00:00.000Z"),
  ];

  it("sums distance by sport in a window", () => {
    const from = new Date("2026-06-01T00:00:00.000Z");
    const totals = distanceBySport(runs, from, now);
    expect(totals.find((t) => t.sport === "running")!.distanceM).toBe(10_000); // June only in window
    expect(totals.find((t) => t.sport === "walking")!.distanceM).toBe(3_000);
    expect(totals.find((t) => t.sport === "cycling")!.distanceM).toBe(25_000);
  });

  it("builds week/month/year periods", () => {
    const week = sportStatsForPeriod(runs, "week", now);
    const year = sportStatsForPeriod(runs, "year", now);
    expect(week.totalDistanceM).toBeGreaterThan(0);
    expect(year.sports.find((s) => s.sport === "running")!.distanceM).toBe(10_000);
  });

  it("formats km", () => {
    expect(formatKm(12340)).toBe("12.3 km");
    expect(formatKm(1500)).toBe("1.50 km");
  });
});
