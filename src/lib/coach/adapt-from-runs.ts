import { addLocalDays, startOfDay, toIsoLocal } from "../analytics/load";
import type { Profile, RunSummary, Workout, WorkoutType } from "../types";
import { comparePlanToRuns, type AdherenceStatus } from "./adherence";

const QUALITY: WorkoutType[] = [
  "tempo",
  "cruise",
  "intervals",
  "fartlek",
  "speed",
  "progression",
  "marathon",
];

export interface ExecutionAdaptation {
  /** blokuj jakość dziś */
  suppressQuality: boolean;
  /** mnożnik easy/long (np. 0.9) */
  volumeScale: number;
  /** wymagaj więcej dni od hard przed jakością */
  extraHardGap: number;
  /** preferuj recovery zamiast easy */
  preferRecovery: boolean;
  reasons: string[];
  /** skrót do UI / debug */
  recent: Array<{ iso: string; planned: WorkoutType; status: AdherenceStatus }>;
}

/**
 * Porównuje ostatnie dni: plan (przez planForDay) vs faktyczne biegi.
 * planForDay musi być wywołane z adapt:false, żeby uniknąć rekurencji.
 * `asOf` — nie oceniaj dni ≥ asOf (przyszłość / „dziś jeszcze nie”).
 */
export function computeExecutionAdaptation(
  allRuns: RunSummary[],
  profile: Profile,
  day: Date,
  planForDay: (past: Date) => Workout,
  lookbackDays = 7,
  asOf: Date = new Date(),
): ExecutionAdaptation {
  const dayStart = startOfDay(day);
  const asOfStart = startOfDay(asOf);
  const recent: ExecutionAdaptation["recent"] = [];
  let tooHardEasy = 0;
  let skippedQuality = 0;
  let skippedTraining = 0;
  let unplannedHardOnRest = 0;
  let matched = 0;

  for (let i = 1; i <= lookbackDays; i++) {
    const past = addLocalDays(dayStart, -i);
    // Nie traktuj przyszłych / bieżącego dnia jako „skipped” przy projekcji planu.
    if (past.getTime() >= asOfStart.getTime()) continue;
    const planned = planForDay(past);
    const result = comparePlanToRuns(planned, allRuns, past, profile);
    recent.push({
      iso: toIsoLocal(past),
      planned: planned.type,
      status: result.status,
    });

    if (result.status === "matched" || result.status === "rest_ok") matched += 1;
    if (result.status === "skipped" && planned.type !== "rest") skippedTraining += 1;
    if (result.status === "skipped" && QUALITY.includes(planned.type)) {
      skippedQuality += 1;
    }
    if (
      result.status === "too_hard" &&
      (planned.type === "easy" || planned.type === "recovery" || planned.type === "rest")
    ) {
      if (planned.type === "rest") unplannedHardOnRest += 1;
      else tooHardEasy += 1;
    }
  }

  const reasons: string[] = [];
  let suppressQuality = false;
  let volumeScale = 1;
  let extraHardGap = 0;
  let preferRecovery = false;

  if (tooHardEasy >= 2 || unplannedHardOnRest >= 1) {
    suppressQuality = true;
    preferRecovery = true;
    volumeScale = Math.min(volumeScale, 0.88);
    extraHardGap = Math.max(extraHardGap, 1);
    reasons.push(
      tooHardEasy >= 2
        ? "Ostatnio kilka spokojnych dni wyszło za mocno — dziś bez jakości, wracamy do kontroli tempa."
        : "Po dniu wolnym zrobiłeś mocny bieg — dziś regeneracja zamiast akcentu.",
    );
  } else if (tooHardEasy === 1) {
    volumeScale = Math.min(volumeScale, 0.92);
    extraHardGap = Math.max(extraHardGap, 1);
    reasons.push(
      "Ostatni „easy” był za intensywny — dziś trzymamy objętość i odkładamy mocniejszy akcent.",
    );
  }

  if (skippedQuality >= 1) {
    suppressQuality = true;
    extraHardGap = Math.max(extraHardGap, 1);
    reasons.push(
      "Ostatni zaplanowany akcent jakościowy został pominięty — najpierw spokojny bieg, jakość wróci po solidnej bazie.",
    );
  }

  if (skippedTraining >= 3) {
    volumeScale = Math.min(volumeScale, 0.85);
    suppressQuality = true;
    preferRecovery = true;
    reasons.push(
      "Kilka zaplanowanych treningów bez biegu — wracamy łagodniej, bez forsowania objętości.",
    );
  } else if (skippedTraining >= 2) {
    volumeScale = Math.min(volumeScale, 0.9);
    reasons.push("Były pominięte treningi — lekko zmniejszam objętość na dziś.");
  }

  if (matched >= 5 && !suppressQuality && volumeScale >= 1) {
    reasons.push("Ostatnie dni dobrze trzymają się planu — kontynuujemy ten rytm.");
  }

  return {
    suppressQuality,
    volumeScale,
    extraHardGap,
    preferRecovery,
    reasons: reasons.slice(0, 3),
    recent,
  };
}
