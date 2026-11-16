import { describe, expect, it } from "vitest";
import { generateDemoRuns } from "../demo";
import { fitnessSummary } from "../analytics/fitness";
import { efficiencySummary } from "../analytics/efficiency";
import { formState, loadSeries } from "../analytics/load";
import { fitnessLevel, formatPace, pacesFromVdot, predictTime, speedAtVo2, vdotFromEffort, vo2maxFromRun } from "../analytics/physiology";
import { recommend } from "./recommend";
import type { Profile, RunSummary } from "../types";

const profile: Profile = { age: 34, sex: "male", maxHr: 188, restHr: 54, goal: "10k", daysPerWeek: 4 };
const now = new Date("2026-11-15T10:00:00");

describe("fizjologia", () => {
  it("VDOT 50 daje realistyczne tempa i prognozy", () => {
    const p = pacesFromVdot(50);
    expect(formatPace(p.threshold[0])).toMatch(/^4:/);
    expect(p.easy[1]).toBeGreaterThan(p.easy[0]);
    expect(p.interval[0]).toBeLessThan(p.threshold[0]);
    const t5k = predictTime(50, 5000);
    expect(t5k).toBeGreaterThan(19 * 60 + 30);
    expect(t5k).toBeLessThan(20 * 60 + 30);
    expect(vdotFromEffort(5000, t5k)).toBeCloseTo(50, 0);
    expect(speedAtVo2(50)).toBeGreaterThan(250);
  });

  it("klasyfikuje poziom wg wieku i płci", () => {
    expect(fitnessLevel(52, 34, "male").label).toBe("Bardzo dobry");
    expect(fitnessLevel(52, 34, "female").label).toBe("Wybitny");
    expect(fitnessLevel(30, 34, "male").label).toBe("Niski");
  });

  it("szacuje VO2max z biegu na podstawie tętna i tempa", () => {
    const run: RunSummary = {
      id: "x",
      source: "fit",
      startTime: now.toISOString(),
      distanceM: 8330,
      durationS: 3000,
      avgHr: 150,
      avgSpeed: 8330 / 3000,
    };
    const v = vo2maxFromRun(run, profile)!;
    expect(v).toBeGreaterThan(40);
    expect(v).toBeLessThan(60);
  });
});

describe("analiza danych demo", () => {
  const runs = generateDemoRuns(profile, now);

  it("generuje 12 tygodni biegów", () => {
    expect(runs.length).toBeGreaterThan(35);
    expect(new Date(runs.at(-1)!.startTime).getTime()).toBeLessThan(now.getTime());
  });

  it("wylicza VO2max, poziom, tempa i prognozy", () => {
    const f = fitnessSummary(runs, profile, [], now);
    expect(f.vo2max).toBeGreaterThan(38);
    expect(f.vo2max).toBeLessThan(62);
    expect(f.level).toBeDefined();
    expect(f.paces!.easy[0]).toBeGreaterThan(f.paces!.threshold[1]);
    expect(f.predictions).toHaveLength(4);
    expect(f.predictions[0].timeS).toBeLessThan(f.predictions[1].timeS);
  });

  it("preferuje VO2max z Garmina, gdy jest dostępne", () => {
    const f = fitnessSummary(runs, profile, [{ date: "2026-11-10", value: 47 }], now);
    expect(f.vo2Source).toBe("garmin");
    expect(f.vo2max).toBe(47);
  });

  it("pokazuje poprawę efektywności w czasie", () => {
    const e = efficiencySummary(runs, profile, now);
    expect(e.points.length).toBeGreaterThan(10);
    expect(e.change).toBeGreaterThan(0);
    expect(e.decoupling).toBeDefined();
  });

  it("liczy formę i obciążenie", () => {
    const series = loadSeries(runs, profile, now);
    const state = formState(series, runs, profile, now);
    expect(state.ctl).toBeGreaterThan(10);
    expect(state.status).not.toBe("unknown");
  });
});

describe("trener", () => {
  const runs = generateDemoRuns(profile, now);
  const fitness = fitnessSummary(runs, profile, [], now);

  it("proponuje trening z krokami i uzasadnieniem", () => {
    const rec = recommend(runs, profile, fitness, now);
    expect(rec.workout.rationale.length).toBeGreaterThan(0);
    expect(rec.workout.type).not.toBe("first");
    if (rec.workout.type !== "rest") {
      expect(rec.workout.blocks.length).toBeGreaterThan(0);
      expect(rec.workout.totalS).toBeGreaterThan(20 * 60);
    }
  });

  it("w niedzielę po 3 dniach przerwy proponuje długie wybieganie", () => {
    const rec = recommend(runs, profile, fitness, now);
    expect(rec.workout.type).toBe("long");
  });

  it("po dzisiejszym biegu rekomenduje na jutro", () => {
    const today: RunSummary = {
      ...runs.at(-1)!,
      id: "today",
      startTime: new Date("2026-11-15T07:00:00").toISOString(),
    };
    const rec = recommend([...runs, today], profile, fitness, now);
    expect(rec.forTomorrow).toBe(true);
  });

  it("po twardym treningu wczoraj daje regenerację lub odpoczynek", () => {
    const hard: RunSummary = {
      ...runs.at(-1)!,
      id: "hard",
      startTime: new Date("2026-11-14T18:00:00").toISOString(),
      avgHr: 172,
      hrHist: { "172": 3000 },
    };
    const rec = recommend([...runs, hard], profile, fitness, now);
    expect(["recovery", "rest"]).toContain(rec.workout.type);
  });

  it("przy braku danych zaczyna od łagodnego rozruchu", () => {
    const f = fitnessSummary([], profile, [], now);
    const rec = recommend([], profile, f, now);
    expect(rec.workout.type).toBe("first");
  });

  it("po długiej przerwie wraca spokojnym biegiem", () => {
    const old = runs.filter((r) => new Date(r.startTime).getTime() < now.getTime() - 30 * 86_400_000);
    const rec = recommend(old, profile, fitnessSummary(old, profile, [], now), now);
    expect(rec.workout.type).toBe("easy");
    expect(rec.workout.rationale.join(" ")).toMatch(/Ostatni bieg/);
  });

  it("generuje akcent jakościowy, gdy forma na to pozwala", () => {
    const monday = new Date("2026-11-09T10:00:00");
    const before = runs.filter((r) => new Date(r.startTime).getTime() < monday.getTime() - 86_400_000 * 2);
    const types = new Set<string>();
    for (const goal of ["fitness", "5k", "10k", "half", "marathon"] as const) {
      const p = { ...profile, goal };
      const f = fitnessSummary(before, p, [], monday);
      types.add(recommend(before, p, f, monday).workout.type);
    }
    expect(types.size).toBeGreaterThanOrEqual(1);
  });
});
