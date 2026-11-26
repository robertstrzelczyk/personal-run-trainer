import { describe, expect, it } from "vitest";
import type { Profile, RunSummary } from "../types";
import { AUTO_SYNC_MS, mergeSyncIntoState, shouldAutoSync } from "./apply-sync";
import type { SyncResult } from "./client";

const profile: Profile = {
  age: 35,
  sex: "male",
  maxHr: 185,
  restHr: 55,
  goal: "10k",
  daysPerWeek: 4,
};

const existing: RunSummary = {
  id: "garmin-1",
  source: "garmin",
  sport: "running",
  startTime: "2026-01-01T08:00:00.000Z",
  distanceM: 5000,
  durationS: 1800,
  avgSpeed: 5000 / 1800,
};

describe("apply-sync", () => {
  it("auto-syncs when never synced or stale", () => {
    expect(shouldAutoSync(null, true)).toBe(true);
    expect(shouldAutoSync(new Date().toISOString(), true)).toBe(false);
    expect(shouldAutoSync(new Date(Date.now() - AUTO_SYNC_MS - 1000).toISOString(), true)).toBe(
      true,
    );
    expect(shouldAutoSync(null, false)).toBe(false);
  });

  it("merges new runs, vo2 and hr settings", () => {
    const incoming: RunSummary = {
      id: "garmin-2",
      source: "garmin",
      sport: "walking",
      startTime: "2026-01-02T08:00:00.000Z",
      distanceM: 3000,
      durationS: 2400,
      avgSpeed: 3000 / 2400,
    };
    const result: SyncResult = {
      runs: [incoming],
      vo2: [{ date: "2026-01-02", value: 48 }],
      maxHr: 190,
      restHr: 52,
      alreadyKnown: 1,
      failed: 0,
      warnings: [],
    };
    const merged = mergeSyncIntoState(result, {
      profile,
      runs: [existing],
      vo2: [{ date: "2026-01-01", value: 47 }],
      lastSync: null,
    });
    expect(merged.runs).toHaveLength(2);
    expect(merged.profile.maxHr).toBe(190);
    expect(merged.lastSync).toBeTruthy();
    expect(merged.vo2).toEqual(
      expect.arrayContaining([
        { date: "2026-01-01", value: 47 },
        { date: "2026-01-02", value: 48 },
      ]),
    );
  });

  it("does not bump lastSync after incomplete sync", () => {
    const prev = "2026-01-01T00:00:00.000Z";
    const result: SyncResult = {
      runs: [],
      vo2: [],
      alreadyKnown: 0,
      failed: 2,
      warnings: ["429"],
      incomplete: true,
    };
    const merged = mergeSyncIntoState(result, {
      profile,
      runs: [existing],
      vo2: [],
      lastSync: prev,
    });
    expect(merged.lastSync).toBe(prev);
  });
});
