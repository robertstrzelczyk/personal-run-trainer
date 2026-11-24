import { startOfDay } from "../analytics/load";
import { parseRaceDate } from "./race-phase";
import type { Profile, RunFeedback } from "../types";

/** Czy dziś (lub podany dzień) jest w oknie deload. */
export function isDeloadActive(profile: Profile, day: Date = new Date()): boolean {
  if (!profile.deloadUntil) return false;
  const until = startOfDay(parseRaceDate(profile.deloadUntil));
  return startOfDay(day).getTime() <= until.getTime();
}

/** Średnie RPE z ostatnich N dni z feedbackiem (jeśli ≥2 wpisy). */
export function recentAvgRpe(
  feedback: Record<string, RunFeedback>,
  runIdToStart: Map<string, string>,
  day: Date,
  lookbackDays = 7,
): number | undefined {
  const dayMs = startOfDay(day).getTime();
  const scores: number[] = [];
  for (const [id, fb] of Object.entries(feedback)) {
    if (!fb.rpe) continue;
    const start = runIdToStart.get(id);
    if (!start) continue;
    const age = (dayMs - new Date(start).getTime()) / 86_400_000;
    if (age >= 0 && age <= lookbackDays) scores.push(fb.rpe);
  }
  if (scores.length < 2) return undefined;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function deloadUntilFromToday(days: number, now: Date = new Date()): string {
  const d = startOfDay(now);
  d.setDate(d.getDate() + Math.max(1, days));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
