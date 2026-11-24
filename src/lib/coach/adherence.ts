import { classifyRun, daysBetween, startOfDay } from "../analytics/load";
import { median } from "../analytics/physiology";
import type { Profile, RunSummary, Workout, WorkoutType } from "../types";

export type AdherenceStatus = "matched" | "too_hard" | "too_easy" | "skipped" | "rest_ok" | "partial";

export interface AdherenceResult {
  status: AdherenceStatus;
  label: string;
  detail: string;
  /** suma dystansu wykonanych biegów tego dnia (m) */
  doneDistanceM: number;
  /** suma czasu (s) */
  doneDurationS: number;
}

const QUALITY: WorkoutType[] = [
  "tempo",
  "intervals",
  "fartlek",
  "speed",
  "progression",
  "marathon",
];

const EASYISH: WorkoutType[] = ["easy", "recovery", "first", "long"];

export function adherenceLabel(status: AdherenceStatus): string {
  return {
    matched: "Zgodny",
    too_hard: "Za ciężki",
    too_easy: "Za lekki",
    skipped: "Pominięty",
    rest_ok: "Odpoczynek OK",
    partial: "Częściowo",
  }[status];
}

function runsOnDay(runs: RunSummary[], day: Date): RunSummary[] {
  const start = startOfDay(day);
  return runs.filter((r) => daysBetween(new Date(r.startTime), start) === 0);
}

/**
 * Porównuje plan na dany dzień z faktycznymi biegami (running) z tego dnia.
 */
export function comparePlanToRuns(
  planned: Workout,
  runs: RunSummary[],
  day: Date,
  profile: Profile,
): AdherenceResult {
  const dayRuns = runsOnDay(runs, day);
  const doneDistanceM = dayRuns.reduce((s, r) => s + r.distanceM, 0);
  const doneDurationS = dayRuns.reduce((s, r) => s + r.durationS, 0);

  if (planned.type === "rest") {
    if (!dayRuns.length) {
      return {
        status: "rest_ok",
        label: adherenceLabel("rest_ok"),
        detail: "Zaplanowany odpoczynek i bez biegu — OK.",
        doneDistanceM: 0,
        doneDurationS: 0,
      };
    }
    const med = median(dayRuns.map((r) => r.durationS)) ?? 30 * 60;
    const anyHard = dayRuns.some((r) => classifyRun(r, profile, med).isHard);
    if (anyHard) {
      return {
        status: "too_hard",
        label: adherenceLabel("too_hard"),
        detail: "Był zaplanowany odpoczynek, a wykonałeś mocniejszy bieg.",
        doneDistanceM,
        doneDurationS,
      };
    }
    return {
      status: "partial",
      label: adherenceLabel("partial"),
      detail: "Był rest, ale zaliczyłeś lekki ruch — w porządku, byle nie forsować.",
      doneDistanceM,
      doneDurationS,
    };
  }

  if (!dayRuns.length) {
    return {
      status: "skipped",
      label: adherenceLabel("skipped"),
      detail: "Brak biegu w dniu zaplanowanego treningu.",
      doneDistanceM: 0,
      doneDurationS: 0,
    };
  }

  const plannedM = Math.max(planned.totalM, 1);
  const plannedS = Math.max(planned.totalS, 1);
  const distRatio = doneDistanceM / plannedM;
  const timeRatio = doneDurationS / plannedS;
  const volumeRatio = Math.max(distRatio, timeRatio * 0.85);

  const medAll =
    median(runs.map((r) => r.durationS).filter((s) => s > 0)) ?? planned.totalS;
  const intensities = dayRuns.map((r) => classifyRun(r, profile, medAll));
  const didHard = intensities.some((i) => i.isHard);
  const didLong = intensities.some((i) => i.isLong);
  const wantedQuality = QUALITY.includes(planned.type);
  const wantedEasy = EASYISH.includes(planned.type);
  const wantedLong = planned.type === "long";

  if (wantedQuality && didHard && volumeRatio >= 0.55) {
    return {
      status: "matched",
      label: adherenceLabel("matched"),
      detail: "Akcent jakościowy wykonany w sensownym zakresie objętości.",
      doneDistanceM,
      doneDurationS,
    };
  }

  if (wantedLong && (didLong || volumeRatio >= 0.75)) {
    return {
      status: "matched",
      label: adherenceLabel("matched"),
      detail: "Długi bieg zaliczony.",
      doneDistanceM,
      doneDurationS,
    };
  }

  if (wantedEasy && !didHard && volumeRatio >= 0.55 && volumeRatio <= 1.45) {
    return {
      status: "matched",
      label: adherenceLabel("matched"),
      detail: "Spokojny trening w zgodzie z planem.",
      doneDistanceM,
      doneDurationS,
    };
  }

  if (wantedEasy && didHard) {
    return {
      status: "too_hard",
      label: adherenceLabel("too_hard"),
      detail: "Plan był spokojny, a bieg wyszedł intensywny.",
      doneDistanceM,
      doneDurationS,
    };
  }

  if (wantedQuality && !didHard) {
    if (volumeRatio < 0.45) {
      return {
        status: "too_easy",
        label: adherenceLabel("too_easy"),
        detail: "Zaplanowany akcent, a wykonanie było krótkie / bez intensywności.",
        doneDistanceM,
        doneDurationS,
      };
    }
    return {
      status: "partial",
      label: adherenceLabel("partial"),
      detail: "Był plan jakościowy — objętość jest, ale bez wyraźnego akcentu HR.",
      doneDistanceM,
      doneDurationS,
    };
  }

  if (volumeRatio < 0.45) {
    return {
      status: "too_easy",
      label: adherenceLabel("too_easy"),
      detail: "Wykonanie wyraźnie krótsze niż plan.",
      doneDistanceM,
      doneDurationS,
    };
  }

  if (volumeRatio > 1.55 && (didHard || wantedEasy)) {
    return {
      status: "too_hard",
      label: adherenceLabel("too_hard"),
      detail: "Objętość wyraźnie powyżej planu.",
      doneDistanceM,
      doneDurationS,
    };
  }

  return {
    status: "partial",
    label: adherenceLabel("partial"),
    detail: "Trening wykonany, ale nie idealnie pod plan.",
    doneDistanceM,
    doneDurationS,
  };
}
