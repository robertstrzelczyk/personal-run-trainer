import { DAY_MS, hrFromReserve } from "./analytics/physiology";
import type { Profile, RunSummary } from "./types";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kind = "easy" | "quality" | "long";

/** Przykładowe dane: 12 tygodni biegania rekreacyjnego, 4 treningi tygodniowo, z lekkim postępem. */
export function generateDemoRuns(profile: Profile, now: Date = new Date()): RunSummary[] {
  const rand = rng(20261115);
  const runs: RunSummary[] = [];
  const today = new Date(now);
  today.setHours(7, 30, 0, 0);

  const plan: Array<{ offset: number; kind: Kind }> = [];
  for (let week = 11; week >= 0; week--) {
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - ((today.getDay() + 7) % 7) - week * 7);
    const at = (dow: number) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() - ((7 - dow) % 7));
      return Math.round((today.getTime() - d.getTime()) / DAY_MS);
    };
    plan.push({ offset: at(2), kind: "easy" });
    plan.push({ offset: at(4), kind: "quality" });
    plan.push({ offset: at(6), kind: "easy" });
    plan.push({ offset: at(0), kind: "long" });
  }

  const gaussian = () => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  const firstOffset = plan.length;
  plan.forEach((item, idx) => {
    if (item.offset < 2) return;
    const progress = idx / firstOffset;
    const date = new Date(today.getTime() - item.offset * DAY_MS);
    date.setHours(item.kind === "long" ? 8 : 18, Math.floor(rand() * 40), 0, 0);

    const fitnessGain = 1 - 0.045 * progress;
    let paceSecKm: number;
    let minutes: number;
    let frac: number;
    let sigma: number;
    let decoupling: number;
    if (item.kind === "easy") {
      paceSecKm = (390 + gaussian() * 8) * fitnessGain;
      minutes = 38 + Math.round(gaussian() * 4);
      frac = 0.68 + gaussian() * 0.015 - progress * 0.01;
      sigma = 5;
      decoupling = 2.5 + gaussian() * 1.2;
    } else if (item.kind === "quality") {
      paceSecKm = (335 + gaussian() * 8) * fitnessGain;
      minutes = 50;
      frac = 0.8 + gaussian() * 0.015;
      sigma = 11;
      decoupling = 5 + gaussian();
    } else {
      paceSecKm = (400 + gaussian() * 8) * fitnessGain;
      minutes = 68 + Math.round(progress * 22) + Math.round(gaussian() * 4);
      frac = 0.7 + gaussian() * 0.015 - progress * 0.01;
      sigma = 6;
      decoupling = 5.5 + gaussian() * 1.5 - progress;
    }

    const avgHr = hrFromReserve(frac, profile);
    const durationS = minutes * 60;
    const distanceM = Math.round((durationS / paceSecKm) * 1000);
    const hrHist: Record<string, number> = {};
    for (let bpm = avgHr - 3 * sigma; bpm <= avgHr + 3 * sigma; bpm++) {
      const w = Math.exp(-0.5 * ((bpm - avgHr) / sigma) ** 2);
      const secs = Math.round(w * (durationS / (sigma * 2.5)));
      if (secs > 0) {
        hrHist[bpm] = secs;
      }
    }

    const best: Record<string, number> = {};
    const fastPace = item.kind === "quality" ? paceSecKm * 0.9 : paceSecKm * 0.985;
    if (distanceM >= 1000) best["1000"] = Math.round(fastPace);
    if (distanceM >= 3000) best["3000"] = Math.round(fastPace * 3 * 1.01);
    if (distanceM >= 5000) best["5000"] = Math.round(fastPace * 5 * 1.02);

    runs.push({
      id: `demo-${date.getTime()}`,
      source: "demo",
      name: item.kind === "long" ? "Długi bieg" : item.kind === "quality" ? "Bieg z akcentem" : "Bieg spokojny",
      startTime: date.toISOString(),
      distanceM,
      durationS,
      avgHr,
      maxHr: Math.min(profile.maxHr, avgHr + Math.round(sigma * 2.4)),
      avgSpeed: distanceM / durationS,
      avgCadence: Math.round(164 + progress * 4 + (item.kind === "quality" ? 6 : 0) + gaussian()),
      ascentM: Math.round(30 + rand() * 60),
      decouplingPct: Math.max(0, decoupling),
      hrHist,
      best,
    });
  });

  return runs.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}
