import { describe, expect, it } from "vitest";
import { analyzeHrZones, formatZoneMinutes, minHrFromHist, zoneForBpm } from "./hr-zones";

describe("hr-zones", () => {
  it("maps bpm to classic %HRmax zones", () => {
    expect(zoneForBpm(100, 200)).toBe(1);
    expect(zoneForBpm(130, 200)).toBe(2);
    expect(zoneForBpm(150, 200)).toBe(3);
    expect(zoneForBpm(170, 200)).toBe(4);
    expect(zoneForBpm(190, 200)).toBe(5);
  });

  it("aggregates histogram into zone percentages", () => {
    const zones = analyzeHrZones({ "120": 600, "160": 400 }, 200);
    const z2 = zones.find((z) => z.id === 2)!;
    const z4 = zones.find((z) => z.id === 4)!;
    expect(z2.seconds).toBe(600);
    expect(z4.seconds).toBe(400);
    expect(z2.percent).toBe(60);
    expect(z4.percent).toBe(40);
  });

  it("reads min hr from histogram", () => {
    expect(minHrFromHist({ "95": 10, "140": 20 })).toBe(95);
    expect(minHrFromHist(undefined)).toBeUndefined();
  });

  it("formats zone minutes", () => {
    expect(formatZoneMinutes(45)).toBe("45 s");
    expect(formatZoneMinutes(120)).toBe("2 min");
    expect(formatZoneMinutes(150)).toBe("2 min 30 s");
  });
});
