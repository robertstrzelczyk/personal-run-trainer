import { describe, expect, it } from "vitest";
import { Decoder, Stream } from "@garmin/fitsdk";
import { NotARunError, parseRunFit } from "./parse-run";
import { encodeSyntheticRun } from "./synth";
import { encodeWorkoutFit, fitText } from "./encode-workout";
import { intervals, easyRun, type BuildContext } from "../coach/workouts";
import { pacesFromVdot } from "../analytics/physiology";

const profile = { age: 35, sex: "male" as const, maxHr: 190, restHr: 55, goal: "10k" as const, daysPerWeek: 4 };
const ctx: BuildContext = { profile, paces: pacesFromVdot(48) };

describe("parseRunFit", () => {
  it("odczytuje dystans, tętno, kadencję i dryf", () => {
    const bytes = encodeSyntheticRun({
      start: new Date("2026-11-01T07:00:00Z"),
      durationS: 45 * 60,
      paceSecPerKm: 330,
      hr: 150,
      hrDrift: 12,
      cadence: 170,
    });
    const run = parseRunFit(bytes, "fit");
    expect(run.distanceM).toBeGreaterThan(8000);
    expect(run.distanceM).toBeLessThan(9000);
    expect(run.avgHr).toBeGreaterThan(145);
    expect(run.avgCadence).toBeGreaterThanOrEqual(168);
    expect(run.avgCadence).toBeLessThanOrEqual(172);
    expect(run.decouplingPct).toBeGreaterThan(3);
    expect(run.best?.["5000"]).toBeGreaterThan(1500);
    expect(run.best?.["5000"]).toBeLessThan(1800);
    expect(Object.keys(run.hrHist ?? {}).length).toBeGreaterThan(5);
  });

  it("odrzuca aktywności inne niż bieg", () => {
    const bytes = encodeSyntheticRun({
      start: new Date("2026-11-01T07:00:00Z"),
      durationS: 1800,
      paceSecPerKm: 600,
      hr: 110,
      sport: "cycling",
    });
    expect(() => parseRunFit(bytes, "fit")).toThrow(NotARunError);
  });

  it("odrzuca pliki, które nie są FIT", () => {
    expect(() => parseRunFit(new Uint8Array([1, 2, 3, 4]), "fit")).toThrow();
  });
});

describe("encodeWorkoutFit", () => {
  it("tworzy poprawny plik FIT treningu z powtórzeniami i celami", () => {
    const workout = intervals(ctx, 30);
    const bytes = encodeWorkoutFit(workout);
    const decoder = new Decoder(Stream.fromByteArray(Array.from(bytes)));
    expect(decoder.checkIntegrity()).toBe(true);
    const { messages, errors } = decoder.read();
    expect(errors).toEqual([]);
    expect(messages.fileIdMesgs?.[0].type).toBe("workout");
    expect(messages.workoutMesgs?.[0].sport).toBe("running");
    const steps = messages.workoutStepMesgs ?? [];
    expect(messages.workoutMesgs?.[0].numValidSteps).toBe(steps.length);
    const repeat = steps.find((s) => s.durationType === "repeatUntilStepsCmplt");
    expect(repeat).toBeDefined();
    expect(Number(repeat!.durationValue)).toBeLessThan(Number(repeat!.messageIndex));
    const speedStep = steps.find((s) => s.targetType === "speed");
    expect(Number(speedStep!.customTargetSpeedLow)).toBeLessThan(Number(speedStep!.customTargetSpeedHigh));
    const hrStep = steps.find((s) => s.targetType === "heartRate");
    // wartości > 100 w FIT oznaczają bpm + 100
    expect(Number(hrStep!.customTargetHeartRateLow) - 100).toBeGreaterThan(80);
    expect(Number(hrStep!.customTargetHeartRateHigh) - 100).toBeLessThan(190);
  });

  it("usuwa polskie znaki z nazw", () => {
    expect(fitText("Długie wybieganie żółć", 15)).toBe("Dlugie wybiegan");
  });

  it("obsługuje prosty bieg spokojny", () => {
    const bytes = encodeWorkoutFit(easyRun(ctx, 40, false));
    expect(bytes.length).toBeGreaterThan(30);
  });
});
