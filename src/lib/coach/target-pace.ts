import { formatMinutes, predictTime, vdotFromEffort } from "../analytics/physiology";
import type { RaceDistance, RaceEvent } from "../types";

export type TargetDifficulty = "easy" | "realistic" | "ambitious" | "stretch";

export interface TargetAssessment {
  race: RaceEvent;
  distanceM: number;
  targetTimeS: number;
  targetVdot: number;
  /** przewidywany czas przy obecnym VDOT (jeśli znany) */
  predictedTimeS?: number;
  /** różnica targetVdot − currentVdot */
  deltaVdot?: number;
  difficulty: TargetDifficulty;
  label: string;
  rationale: string;
  /** które typy jakości preferować przy rotacji */
  preferQualities: Array<"tempo" | "intervals" | "fartlek" | "speed" | "progression" | "marathon" | "cruise">;
}

export const RACE_DISTANCE_M: Record<RaceDistance, number> = {
  "5k": 5000,
  "10k": 10000,
  half: 21097.5,
  marathon: 42195,
};

const PREFER_BY_DISTANCE: Record<
  RaceDistance,
  TargetAssessment["preferQualities"]
> = {
  "5k": ["intervals", "speed", "tempo", "fartlek"],
  "10k": ["tempo", "intervals", "progression", "fartlek"],
  half: ["tempo", "cruise", "progression", "marathon"],
  marathon: ["marathon", "tempo", "progression", "cruise"],
};

/**
 * Ocena celu czasowego względem obecnego VDOT.
 * Ambicja: target wymaga wyraźnie wyższego VDOT niż forma.
 */
export function assessRaceTarget(
  race: RaceEvent,
  currentVdot: number | undefined,
): TargetAssessment | undefined {
  if (!race.targetTimeS || race.targetTimeS < 60) return undefined;
  const distanceM = RACE_DISTANCE_M[race.distance];
  const targetVdot = vdotFromEffort(distanceM, race.targetTimeS);
  const predictedTimeS =
    currentVdot !== undefined ? predictTime(currentVdot, distanceM) : undefined;
  const deltaVdot =
    currentVdot !== undefined ? targetVdot - currentVdot : undefined;

  let difficulty: TargetDifficulty = "realistic";
  if (deltaVdot === undefined) {
    difficulty = "realistic";
  } else if (deltaVdot <= -1.5) {
    difficulty = "easy";
  } else if (deltaVdot <= 1.5) {
    difficulty = "realistic";
  } else if (deltaVdot <= 3.5) {
    difficulty = "ambitious";
  } else {
    difficulty = "stretch";
  }

  const label = {
    easy: "cel łatwy",
    realistic: "cel realistyczny",
    ambitious: "cel ambitny",
    stretch: "cel bardzo ambitny",
  }[difficulty];

  const parts = [
    `Cel na ${formatMinutes(race.targetTimeS)} (${label}).`,
  ];
  if (predictedTimeS !== undefined && currentVdot !== undefined) {
    parts.push(
      `Przy obecnym VDOT ~${currentVdot.toFixed(1)} szacunek to ok. ${formatMinutes(predictedTimeS)}.`,
    );
  }
  if (difficulty === "ambitious" || difficulty === "stretch") {
    parts.push("Plan kładzie nacisk na akcenty pod tempo startowe.");
  } else if (difficulty === "easy") {
    parts.push("Cel jest w zasięgu — utrzymujemy jakość bez forsowania objętości.");
  }

  return {
    race,
    distanceM,
    targetTimeS: race.targetTimeS,
    targetVdot,
    predictedTimeS,
    deltaVdot,
    difficulty,
    label,
    rationale: parts.join(" "),
    preferQualities: PREFER_BY_DISTANCE[race.distance],
  };
}

/** Przesuwa rotację jakości, żeby preferowane typy były pierwsze. */
export function reorderQualityRotation<T extends string>(
  rotation: T[],
  prefer: T[],
): T[] {
  const preferred = prefer.filter((q) => rotation.includes(q));
  const rest = rotation.filter((q) => !preferred.includes(q));
  const merged = [...preferred, ...rest];
  return merged.length ? merged : rotation;
}
