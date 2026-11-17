import { describe, expect, it } from "vitest";
import { fitnessLevel, formatPace, formatDuration, estimateMaxHr } from "./physiology";

describe("physiology", () => {
  it("formats pace and duration", () => {
    expect(formatPace(330)).toBe("5:30");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(125)).toBe("2:05");
  });

  it("estimates max HR", () => {
    expect(estimateMaxHr(40)).toBe(180);
  });

  it("assigns fitness level labels in Polish", () => {
    const level = fitnessLevel(55, 35, "male");
    expect(level.label).toMatch(/Dobry|Bardzo dobry|Wybitny|Przeciętny|Niski/);
  });
});
