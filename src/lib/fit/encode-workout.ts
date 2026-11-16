import { Encoder, Profile as FitProfile } from "@garmin/fitsdk";
import type { Workout, WorkoutStep } from "../types";

export function fitText(value: string, max: number) {
  return value
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .slice(0, max)
    .trim();
}

const INTENSITY = {
  warmup: "warmup",
  work: "active",
  recovery: "recovery",
  cooldown: "cooldown",
  easy: "active",
} as const;

interface FitStepMesg {
  mesgNum: number;
  messageIndex: number;
  wktStepName?: string;
  durationType: string;
  durationValue: number;
  targetType: string;
  targetValue: number;
  customTargetValueLow?: number;
  customTargetValueHigh?: number;
  intensity?: string;
}

function speedFromPace(secPerKm: number) {
  return Math.round((1000 / secPerKm) * 1000);
}

function toFitStep(step: WorkoutStep, index: number): FitStepMesg {
  const mesg: FitStepMesg = {
    mesgNum: FitProfile.MesgNum.WORKOUT_STEP,
    messageIndex: index,
    wktStepName: fitText(step.label, 15),
    durationType: step.distanceM ? "distance" : "time",
    durationValue: step.distanceM
      ? Math.round(step.distanceM * 100)
      : Math.round((step.durationS ?? 0) * 1000),
    targetType: "open",
    targetValue: 0,
    intensity: INTENSITY[step.kind],
  };

  const prefersHr = step.kind === "easy" || step.kind === "warmup" || step.kind === "cooldown";
  if (prefersHr && step.hrLow && step.hrHigh) {
    mesg.targetType = "heartRate";
    mesg.customTargetValueLow = step.hrLow + 100;
    mesg.customTargetValueHigh = step.hrHigh + 100;
  } else if (step.kind === "work" && step.paceFast && step.paceSlow) {
    mesg.targetType = "speed";
    mesg.customTargetValueLow = speedFromPace(step.paceSlow);
    mesg.customTargetValueHigh = speedFromPace(step.paceFast);
  }
  return mesg;
}

/** Zamienia wygenerowany trening w plik FIT (typ: workout) do skopiowania na zegarek. */
export function encodeWorkoutFit(workout: Workout): Uint8Array {
  const mesgs: FitStepMesg[] = [];
  for (const block of workout.blocks) {
    if (block.type === "step") {
      mesgs.push(toFitStep(block.step, mesgs.length));
    } else {
      const loopStart = mesgs.length;
      for (const s of block.steps) mesgs.push(toFitStep(s, mesgs.length));
      mesgs.push({
        mesgNum: FitProfile.MesgNum.WORKOUT_STEP,
        messageIndex: mesgs.length,
        durationType: "repeatUntilStepsCmplt",
        durationValue: loopStart,
        targetType: "open",
        targetValue: block.count,
      });
    }
  }

  const encoder = new Encoder();
  const write = (m: object) => encoder.writeMesg(m as Parameters<Encoder["writeMesg"]>[0]);
  write({
    mesgNum: FitProfile.MesgNum.FILE_ID,
    type: "workout",
    manufacturer: "development",
    product: 0,
    serialNumber: 1,
    timeCreated: new Date(),
  });
  write({
    mesgNum: FitProfile.MesgNum.WORKOUT,
    sport: "running",
    capabilities: 32,
    numValidSteps: mesgs.length,
    wktName: fitText(workout.title, 15),
  });
  for (const m of mesgs) write(m);
  return encoder.close();
}

export function workoutFileName(workout: Workout, date: Date) {
  const slug = fitText(workout.title, 24).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const d = date.toISOString().slice(0, 10);
  return `${d}-${slug || "trening"}.fit`;
}
