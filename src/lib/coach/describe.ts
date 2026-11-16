import { formatMinutes, formatPace } from "../analytics/physiology";
import type { Workout, WorkoutStep } from "../types";

export function describeDuration(step: WorkoutStep) {
  if (step.distanceM) {
    return step.distanceM >= 1000
      ? `${(step.distanceM / 1000).toFixed(step.distanceM % 1000 ? 1 : 0)} km`
      : `${step.distanceM} m`;
  }
  const s = step.durationS ?? 0;
  if (s < 120) return `${s} s`;
  const m = s / 60;
  return Number.isInteger(m) ? `${m} min` : `${m.toFixed(1).replace(".", ",")} min`;
}

export function describeTarget(step: WorkoutStep) {
  const parts: string[] = [];
  if (step.paceFast && step.paceSlow) {
    parts.push(`${formatPace(step.paceFast)}–${formatPace(step.paceSlow)} /km`);
  }
  if (step.hrLow && step.hrHigh) parts.push(`tętno ${step.hrLow}–${step.hrHigh}`);
  return parts.join(" · ");
}

export function workoutToText(workout: Workout): string {
  const lines = [`${workout.title}`, `${formatMinutes(workout.totalS)}, ok. ${(workout.totalM / 1000).toFixed(1)} km`, ""];
  workout.blocks.forEach((b, i) => {
    if (b.type === "step") {
      lines.push(`${i + 1}. ${b.step.label}: ${describeDuration(b.step)} ${describeTarget(b.step)}`.trim());
    } else {
      lines.push(`${i + 1}. Powtórz ${b.count}×:`);
      b.steps.forEach((s) => lines.push(`   - ${s.label}: ${describeDuration(s)} ${describeTarget(s)}`.trim()));
    }
  });
  return lines.join("\n");
}
