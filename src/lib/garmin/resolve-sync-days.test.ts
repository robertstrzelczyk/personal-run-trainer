import { describe, expect, it } from "vitest";
import { FULL_HISTORY_DAYS } from "./personal-api";
import { resolveSyncDays } from "./service";

describe("resolveSyncDays", () => {
  it("maps 0 / negative to full history span", () => {
    expect(resolveSyncDays(0)).toBe(FULL_HISTORY_DAYS);
    expect(resolveSyncDays(-1)).toBe(FULL_HISTORY_DAYS);
  });

  it("clamps normal day counts", () => {
    expect(resolveSyncDays(90)).toBe(90);
    expect(resolveSyncDays(365)).toBe(365);
    expect(resolveSyncDays(99999)).toBe(FULL_HISTORY_DAYS);
  });
});
