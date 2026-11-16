import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ isNative: false, request: vi.fn() }));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.isNative, getPlatform: () => "android" },
  CapacitorHttp: { request: native.request },
}));

import { garminHttp } from "./http";
import { obtainToken } from "./personal-api";
import { activitiesForDays, metricsForDays } from "./service";

const TOKEN = "abcdefghijklmnop1234";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  native.isNative = false;
  native.request.mockReset();
  vi.unstubAllGlobals();
});

describe("Garmin Personal API (serwer i przeglądarka)", () => {
  it("pobiera token i listę biegów przez fetch", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("personal-api-key/token")) return jsonResponse({ access_token: TOKEN });
      return jsonResponse([
        { activityId: 1, startTimeGMT: "2026-11-10 06:00:00", activityType: { typeKey: "running" }, distance: 5000 },
        { activityId: 2, startTimeGMT: "2026-11-11 06:00:00", activityType: { typeKey: "cycling" } },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await obtainToken("klucz-api-123456")).toBe(TOKEN);
    const activities = await activitiesForDays(TOKEN, 30);
    expect(activities.map((a) => a.id)).toEqual(["1"]);
    expect(activities[0].startTime).toBe("2026-11-10T06:00:00.000Z");
  });

  it("zbiera VO2max i strefy tętna, a błędy zamienia w ostrzeżenia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("maxmet")) return jsonResponse([{ generic: { calendarDate: "2026-11-09", vo2MaxPreciseValue: 51.24 } }]);
        return jsonResponse({}, 500);
      }),
    );
    const metrics = await metricsForDays(TOKEN, 60);
    expect(metrics.vo2).toEqual([{ date: "2026-11-09", value: 51.2 }]);
    expect(metrics.warnings).toEqual(["Nie udało się pobrać stref tętna z Garmin."]);
  });
});

describe("Garmin Personal API (aplikacja mobilna)", () => {
  it("używa natywnego klienta HTTP i dekoduje odpowiedź binarną", async () => {
    native.isNative = true;
    vi.stubGlobal("window", {});
    const fit = new Uint8Array([1, 2, 3, 250]);
    native.request.mockResolvedValue({ status: 200, data: btoa(String.fromCharCode(...fit)), headers: {} });
    const res = await garminHttp("https://example.test/x", { headers: { Authorization: "Bearer t" } });
    expect(native.request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.test/x", responseType: "arraybuffer" }),
    );
    expect(res.ok).toBe(true);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(fit);
  });

  it("przekazuje kod błędu Garmin", async () => {
    native.isNative = true;
    vi.stubGlobal("window", {});
    native.request.mockResolvedValue({ status: 401, data: "", headers: {} });
    await expect(obtainToken("klucz-api-123456")).rejects.toMatchObject({ status: 401 });
  });
});
