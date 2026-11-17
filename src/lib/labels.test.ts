import { describe, expect, it } from "vitest";
import { GOAL_OPTIONS, SEX_OPTIONS, VO2_SOURCE_LABELS, goalLabelPl, sexLabel } from "./labels";
import { normalizeSport, SPORT_LABELS } from "./sport";

describe("labels", () => {
  it("maps VO2 sources and profile options to Polish", () => {
    expect(VO2_SOURCE_LABELS.garmin).toBe("Garmin");
    expect(VO2_SOURCE_LABELS.estimate).toBe("Szacunek");
    expect(sexLabel("female")).toBe("Kobieta");
    expect(goalLabelPl("half")).toBe("Półmaraton");
    expect(SEX_OPTIONS).toHaveLength(2);
    expect(GOAL_OPTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it("normalizes Garmin sport keys", () => {
    expect(normalizeSport("running")).toBe("running");
    expect(normalizeSport("trail_running")).toBe("running");
    expect(normalizeSport("walking")).toBe("walking");
    expect(normalizeSport("hiking")).toBe("walking");
    expect(normalizeSport("cycling")).toBe("cycling");
    expect(normalizeSport("indoor_cycling")).toBe("cycling");
    expect(normalizeSport("swimming")).toBeNull();
    expect(SPORT_LABELS.cycling).toBe("Kolarstwo");
  });
});
