import { classifyRun, daysBetween, formState, loadSeries, startOfDay, type FormState } from "../analytics/load";
import { DAY_MS, formatMinutes, median, pacesFromVdot } from "../analytics/physiology";
import type { FitnessSummary } from "../analytics/fitness";
import type { Goal, Profile, RunSummary, Workout } from "../types";
import {
  cruiseIntervals,
  easyRun,
  fartlek,
  firstRun,
  intervals,
  longRun,
  marathonPace,
  progressionRun,
  recoveryRun,
  restDay,
  speedReps,
  tempoRun,
  type BuildContext,
} from "./workouts";

export interface Recommendation {
  /** dzień, którego dotyczy rekomendacja */
  forDate: Date;
  forTomorrow: boolean;
  workout: Workout;
  alternative?: Workout;
  form: FormState;
  weeklyKm: number;
  daysSinceLast: number | undefined;
}

const GOAL_LONG_CAP: Record<Goal, number> = {
  fitness: 75,
  "5k": 90,
  "10k": 100,
  half: 125,
  marathon: 160,
};

type Quality = "tempo" | "intervals" | "fartlek" | "speed" | "progression" | "marathon" | "cruise";

const QUALITY_ROTATION: Record<Goal, Quality[]> = {
  fitness: ["fartlek", "tempo", "progression", "intervals"],
  "5k": ["intervals", "tempo", "fartlek", "speed"],
  "10k": ["tempo", "intervals", "fartlek", "progression"],
  half: ["tempo", "cruise", "progression", "intervals"],
  marathon: ["marathon", "tempo", "progression", "cruise"],
};

const roundTo5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

export const days = (n: number) => `${n} ${plural(n, "dzień", "dni", "dni")}`;

export function recommendForDay(
  allRuns: RunSummary[],
  profile: Profile,
  fitness: FitnessSummary,
  day: Date,
): Recommendation {
  const dayStart = startOfDay(day);
  const runs = allRuns
    .filter((r) => new Date(r.startTime).getTime() < dayStart.getTime())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const yesterday = new Date(dayStart.getTime() - DAY_MS);
  const series = loadSeries(runs, profile, yesterday);
  const form = formState(series, runs, profile, dayStart);

  const paces = fitness.paces ?? pacesFromVdot(35);
  const ctx: BuildContext = { profile, paces };
  const reasons: string[] = [];
  if (!fitness.paces) {
    reasons.push("Nie mam jeszcze szacunku VO2max, więc tempa są ostrożne. Po kilku biegach z pulsometrem się doprecyzują.");
  }

  const last28 = runs.filter((r) => dayStart.getTime() - new Date(r.startTime).getTime() <= 28 * DAY_MS);
  const last7 = runs.filter((r) => dayStart.getTime() - new Date(r.startTime).getTime() <= 7 * DAY_MS);
  const first = runs[0];
  const historyDays = first ? Math.max(7, daysBetween(new Date(first.startTime), dayStart)) : 0;
  const window = Math.min(28, historyDays);
  const weeklyKm = window ? (last28.reduce((s, r) => s + r.distanceM, 0) / 1000) / (window / 7) : 0;

  const lastRun = runs.at(-1);
  const daysSinceLast = lastRun ? daysBetween(new Date(lastRun.startTime), dayStart) : undefined;

  const medianDuration = median(last28.map((r) => r.durationS)) ?? 30 * 60;
  const intensities = new Map(runs.map((r) => [r.id, classifyRun(r, profile, medianDuration)]));
  const lastHard = [...runs].reverse().find((r) => intensities.get(r.id)!.isHard && !intensities.get(r.id)!.isLong);
  const lastLong = [...runs].reverse().find((r) => intensities.get(r.id)!.isLong);
  const daysSinceHard = lastHard ? daysBetween(new Date(lastHard.startTime), dayStart) : 99;
  const daysSinceLong = lastLong ? daysBetween(new Date(lastLong.startTime), dayStart) : 99;
  const runDays7 = new Set(last7.map((r) => new Date(r.startTime).toDateString())).size;

  const finish = (workout: Workout, alternative?: Workout): Recommendation => ({
    forDate: dayStart,
    forTomorrow: false,
    workout: { ...workout, rationale: reasons },
    alternative,
    form,
    weeklyKm,
    daysSinceLast,
  });

  const baseMinutes = clamp(
    roundTo5(
      (median(
        last28
          .filter((r) => !intensities.get(r.id)!.isLong && !intensities.get(r.id)!.isHard)
          .map((r) => r.durationS / 60),
      ) ?? 30) || 30,
    ),
    25,
    70,
  );

  if (runs.length < 3) {
    reasons.push("Masz jeszcze mało zapisanych biegów, więc zaczynamy łagodnie, aby poznać Twoje tętno i tempo.");
    reasons.push("Wgraj więcej aktywności, a plan dopasuje się do Twojej formy.");
    return finish(firstRun(ctx, 25));
  }

  if (daysSinceLast !== undefined && daysSinceLast >= 14) {
    reasons.push(`Ostatni bieg był ${days(daysSinceLast)} temu. Wracamy stopniowo, bez intensywności.`);
    reasons.push("Po przerwie mięśnie i ścięgna adaptują się wolniej niż układ krążenia.");
    return finish(easyRun(ctx, clamp(baseMinutes - 10, 20, 35), false));
  }

  const overloaded = form.status === "overload";
  if (overloaded) {
    reasons.push(
      `Obciążenie ostatnich dni jest wysokie (forma ${form.tsb.toFixed(0)}${form.acwr ? `, stosunek obciążeń 7/28 dni: ${form.acwr.toFixed(2)}` : ""}).`,
    );
    reasons.push("Dzień wolnego teraz zmniejsza ryzyko kontuzji i pozwoli wykonać następny trening jakościowo.");
    return finish(restDay(), recoveryRun(ctx, 25));
  }

  if (runDays7 >= profile.daysPerWeek && form.tsb < 10) {
    reasons.push(
      `W ostatnich 7 dniach biegałeś ${runDays7} ${plural(runDays7, "raz", "razy", "razy")}, a Twój cel to ${profile.daysPerWeek} ${plural(profile.daysPerWeek, "trening", "treningi", "treningów")} tygodniowo.`,
    );
    reasons.push("Dzień odpoczynku jest częścią planu: adaptacja zachodzi wtedy, gdy się regenerujesz.");
    return finish(restDay(), recoveryRun(ctx, 25));
  }

  const ranYesterdayHard =
    daysSinceLast === 1 &&
    lastRun &&
    (intensities.get(lastRun.id)!.isHard || intensities.get(lastRun.id)!.isLong);
  if (ranYesterdayHard || form.tsb < -18) {
    reasons.push(
      ranYesterdayHard
        ? "Wczoraj był mocny lub długi trening, więc dziś stawiamy na regenerację."
        : `Forma jest niska (${form.tsb.toFixed(0)}), więc dziś lekki bieg.`,
    );
    reasons.push("Bieg regeneracyjny poprawia ukrwienie mięśni, a nie dokłada zmęczenia.");
    return finish(recoveryRun(ctx, clamp(baseMinutes - 10, 20, 40)));
  }

  const weekday = dayStart.getDay();
  const weekend = weekday === 6 || weekday === 0;
  const longDue = daysSinceLong >= 9 || (daysSinceLong >= 6 && weekend);
  if (longDue && weeklyKm >= 10 && (daysSinceHard >= 2 || daysSinceLast !== 1)) {
    const lastLongMin = lastLong && daysSinceLong <= 28 ? lastLong.durationS / 60 : baseMinutes * 1.5;
    const target = roundTo5(
      clamp(lastLongMin * 1.08, Math.max(45, baseMinutes * 1.3), GOAL_LONG_CAP[profile.goal]),
    );
    const progressive = (profile.goal === "half" || profile.goal === "marathon") && form.tsb > -8 && target >= 70;
    reasons.push(
      daysSinceLong >= 99
        ? "W ostatnich tygodniach nie było długiego biegu, a to on buduje wytrzymałość."
        : `Ostatni długi bieg był ${days(daysSinceLong)} temu.`,
    );
    reasons.push(`Czas wydłużamy o około 8% względem poprzedniego, do ${formatMinutes(target * 60)}.`);
    return finish(longRun(ctx, target, progressive), easyRun(ctx, baseMinutes, false));
  }

  const qualityReady =
    daysSinceHard >= 3 || (daysSinceHard >= 2 && form.tsb > 3) || daysSinceHard === 99;
  const acwrHigh = form.acwr !== undefined && form.acwr > 1.35;
  if (qualityReady && form.tsb > -12 && !acwrHigh && weeklyKm >= 8) {
    const hardCount = last28.filter(
      (r) => intensities.get(r.id)!.isHard && !intensities.get(r.id)!.isLong,
    ).length;
    const rotation = QUALITY_ROTATION[profile.goal];
    const quality = rotation[hardCount % rotation.length];
    const w = Math.max(weeklyKm, 12);
    const workout =
      quality === "tempo"
        ? tempoRun(ctx, w)
        : quality === "cruise"
          ? cruiseIntervals(ctx, w)
          : quality === "intervals"
            ? intervals(ctx, w)
            : quality === "fartlek"
              ? fartlek(ctx, w)
              : quality === "speed"
                ? speedReps(ctx)
                : quality === "marathon"
                  ? marathonPace(ctx, w)
                  : progressionRun(ctx, clamp(roundTo5(baseMinutes + 5), 35, 60));
    reasons.push(
      daysSinceHard === 99
        ? "Nie widzę ostatnio mocniejszego treningu, a forma pozwala już na akcent."
        : `Ostatni mocniejszy trening był ${days(daysSinceHard)} temu, więc jesteś gotowy na kolejny akcent.`,
    );
    reasons.push(
      `Forma dziś: ${form.tsb >= 0 ? "+" : ""}${form.tsb.toFixed(0)}. Wystarczająco świeży na jakość.`,
    );
    reasons.push(`Cel: ${goalLabel(profile.goal)}. W rotacji akcentów pod ten cel przychodzi teraz kolej na ten rodzaj treningu.`);
    return finish(workout, easyRun(ctx, baseMinutes, false));
  }

  const adjusted = form.tsb > 5 ? baseMinutes + 5 : baseMinutes;
  const stridesOk = daysSinceHard >= 2 && form.tsb > -8;
  if (daysSinceHard <= 1) {
    reasons.push("Wczoraj lub dziś rano miałeś mocniejszy akcent. Dziś spokojnie.");
  } else if (acwrHigh) {
    reasons.push("Obciążenie ostatniego tygodnia jest wyższe niż zwykle, więc odpuszczamy intensywność.");
  } else {
    reasons.push("Spokojny bieg to fundament: buduje bazę tlenową i wzmacnia kondycję bez dużego zmęczenia.");
  }
  reasons.push(`Czas bazuje na Twoich typowych biegach (~${baseMinutes} min).`);
  return finish(easyRun(ctx, clamp(adjusted, 25, 75), stridesOk && weeklyKm >= 12));
}

export function goalLabel(goal: Goal) {
  return {
    fitness: "ogólna sprawność",
    "5k": "5 km",
    "10k": "10 km",
    half: "półmaraton",
    marathon: "maraton",
  }[goal];
}

export function recommend(
  runs: RunSummary[],
  profile: Profile,
  fitness: FitnessSummary,
  now: Date = new Date(),
): Recommendation {
  const ranToday = runs.some((r) => daysBetween(new Date(r.startTime), now) === 0);
  if (ranToday) {
    const tomorrow = startOfDay(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const rec = recommendForDay(runs, profile, fitness, tomorrow);
    return { ...rec, forTomorrow: true };
  }
  return recommendForDay(runs, profile, fitness, now);
}

export function recommendTodayAndTomorrow(
  runs: RunSummary[],
  profile: Profile,
  fitness: FitnessSummary,
  now: Date = new Date(),
): { today: Recommendation; tomorrow: Recommendation; ranToday: boolean } {
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const ranToday = runs.some((r) => daysBetween(new Date(r.startTime), now) === 0);
  const today = {
    ...recommendForDay(runs, profile, fitness, todayStart),
    forTomorrow: false,
  };
  const tomorrow = {
    ...recommendForDay(runs, profile, fitness, tomorrowStart),
    forTomorrow: true,
  };
  return { today, tomorrow, ranToday };
}
