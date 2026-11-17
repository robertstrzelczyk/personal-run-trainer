import type { Goal, Sex } from "./types";

export const VO2_SOURCE_LABELS = {
  garmin: "Garmin",
  estimate: "Szacunek",
  none: "Brak",
} as const;

export const SEX_OPTIONS: Array<{ value: Sex; label: string }> = [
  { value: "male", label: "Mężczyzna" },
  { value: "female", label: "Kobieta" },
];

export const GOAL_OPTIONS: Array<{ value: Goal; label: string }> = [
  { value: "fitness", label: "Ogólna sprawność" },
  { value: "5k", label: "5 km" },
  { value: "10k", label: "10 km" },
  { value: "half", label: "Półmaraton" },
  { value: "marathon", label: "Maraton" },
];

export function sexLabel(sex: Sex) {
  return SEX_OPTIONS.find((o) => o.value === sex)?.label ?? sex;
}

export function goalLabelPl(goal: Goal) {
  return GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? goal;
}
