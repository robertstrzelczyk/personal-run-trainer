import { hrFromReserve } from "../analytics/physiology";
import type {
  Profile,
  StepKind,
  VdotPaces,
  Workout,
  WorkoutBlock,
  WorkoutStep,
  WorkoutType,
} from "../types";

export interface BuildContext {
  profile: Profile;
  paces: VdotPaces;
}

const min = (m: number) => Math.round(m * 60);

function hr(ctx: BuildContext, low: number, high: number) {
  return {
    hrLow: hrFromReserve(low, ctx.profile),
    hrHigh: hrFromReserve(high, ctx.profile),
  };
}

function easyStep(
  ctx: BuildContext,
  kind: StepKind,
  label: string,
  durationS: number,
  hrBand: [number, number] = [0.5, 0.72],
): WorkoutStep {
  return {
    kind,
    label,
    durationS,
    paceFast: ctx.paces.easy[0],
    paceSlow: ctx.paces.easy[1] + 20,
    ...hr(ctx, hrBand[0], hrBand[1]),
  };
}

function stepDistance(step: WorkoutStep, ctx: BuildContext): number {
  if (step.distanceM) return step.distanceM;
  if (!step.durationS) return 0;
  const pace =
    step.paceFast && step.paceSlow
      ? (step.paceFast + step.paceSlow) / 2
      : ctx.paces.easy[1];
  return (step.durationS / pace) * 1000;
}

function stepDuration(step: WorkoutStep, ctx: BuildContext): number {
  if (step.durationS) return step.durationS;
  if (!step.distanceM) return 0;
  const pace =
    step.paceFast && step.paceSlow
      ? (step.paceFast + step.paceSlow) / 2
      : ctx.paces.easy[1];
  return (step.distanceM / 1000) * pace;
}

export function assemble(
  ctx: BuildContext,
  type: WorkoutType,
  title: string,
  summary: string,
  blocks: WorkoutBlock[],
): Workout {
  let totalS = 0;
  let totalM = 0;
  for (const b of blocks) {
    if (b.type === "step") {
      totalS += stepDuration(b.step, ctx);
      totalM += stepDistance(b.step, ctx);
    } else {
      for (const s of b.steps) {
        totalS += stepDuration(s, ctx) * b.count;
        totalM += stepDistance(s, ctx) * b.count;
      }
    }
  }
  return { type, title, summary, rationale: [], blocks, totalS, totalM };
}

const step = (s: WorkoutStep): WorkoutBlock => ({ type: "step", step: s });

function warmup(ctx: BuildContext, minutes = 10): WorkoutBlock {
  return step(easyStep(ctx, "warmup", "Rozgrzewka", min(minutes), [0.45, 0.65]));
}

function cooldown(ctx: BuildContext, minutes = 8): WorkoutBlock {
  return step(easyStep(ctx, "cooldown", "Wyciszenie", min(minutes), [0.4, 0.62]));
}

function strides(ctx: BuildContext, count = 4): WorkoutBlock {
  return {
    type: "repeat",
    count,
    steps: [
      {
        kind: "work",
        label: "Przebieżka",
        durationS: 20,
        paceFast: ctx.paces.repetition[0],
        paceSlow: ctx.paces.interval[0],
        note: "Szybko i swobodnie, bez spinania się",
      },
      {
        kind: "recovery",
        label: "Trucht",
        durationS: 60,
        paceFast: ctx.paces.easy[1],
        paceSlow: ctx.paces.easy[1] + 60,
      },
    ],
  };
}

export function easyRun(ctx: BuildContext, minutes: number, withStrides: boolean) {
  const blocks: WorkoutBlock[] = [
    step(easyStep(ctx, "easy", "Spokojny bieg", min(minutes - (withStrides ? 5 : 0)))),
  ];
  if (withStrides) blocks.push(strides(ctx, 4));
  return assemble(
    ctx,
    "easy",
    "Spokojny bieg aerobowy",
    `${minutes} min w rozmowie, tętno w strefie 2${withStrides ? ", na koniec 4 przebieżki" : ""}.`,
    blocks,
  );
}

export function recoveryRun(ctx: BuildContext, minutes: number) {
  return assemble(
    ctx,
    "recovery",
    "Bieg regeneracyjny",
    `${minutes} min bardzo lekko. Ma pomóc nogom, nie budować formy.`,
    [step(easyStep(ctx, "easy", "Bardzo spokojny bieg", min(minutes), [0.4, 0.62]))],
  );
}

export function firstRun(ctx: BuildContext, minutes: number) {
  const cycles = Math.max(3, Math.round(minutes / 5));
  return assemble(
    ctx,
    "first",
    "Rozruch: trucht z marszem",
    `${cycles} × (4 min truchtu + 1 min marszu). Poznajemy Twoje tętno i tempo.`,
    [
      warmup(ctx, 5),
      {
        type: "repeat",
        count: cycles,
        steps: [
          easyStep(ctx, "work", "Trucht", min(4), [0.45, 0.7]),
          {
            kind: "recovery",
            label: "Marsz",
            durationS: min(1),
          },
        ],
      },
    ],
  );
}

export function longRun(ctx: BuildContext, minutes: number, progressive: boolean) {
  if (!progressive) {
    return assemble(
      ctx,
      "long",
      "Długie wybieganie",
      `${minutes} min w spokojnym tempie. Najważniejszy trening wytrzymałościowy tygodnia.`,
      [step(easyStep(ctx, "easy", "Długi, spokojny bieg", min(minutes), [0.52, 0.74]))],
    );
  }
  const fast = Math.max(8, Math.round(minutes * 0.2));
  return assemble(
    ctx,
    "long",
    "Długie wybieganie z mocniejszym finiszem",
    `${minutes} min, z czego ostatnie ${fast} min w tempie maratońskim.`,
    [
      step(easyStep(ctx, "easy", "Spokojny bieg", min(minutes - fast), [0.52, 0.74])),
      step({
        kind: "work",
        label: "Tempo maratońskie",
        durationS: min(fast),
        paceFast: ctx.paces.marathon[0],
        paceSlow: ctx.paces.marathon[1],
      }),
    ],
  );
}

export function tempoRun(ctx: BuildContext, weeklyKm: number) {
  const tempoMin = Math.min(35, Math.max(16, Math.round(8 + weeklyKm * 0.4)));
  const t = ctx.paces.threshold;
  const work = (m: number): WorkoutStep => ({
    kind: "work",
    label: "Tempo progowe",
    durationS: min(m),
    paceFast: t[0],
    paceSlow: t[1],
    note: "Mocno, ale kontrolowanie: da się wypowiedzieć kilka słów",
  });
  const blocks: WorkoutBlock[] = [warmup(ctx, 10)];
  if (tempoMin >= 26 || weeklyKm < 20) {
    const reps = 2;
    const each = Math.round(tempoMin / reps);
    blocks.push({
      type: "repeat",
      count: reps,
      steps: [
        work(each),
        { kind: "recovery", label: "Trucht", durationS: min(2), paceFast: ctx.paces.easy[1], paceSlow: ctx.paces.easy[1] + 60 },
      ],
    });
    blocks.push(cooldown(ctx));
    return assemble(
      ctx,
      "tempo",
      `Tempo progowe ${reps} × ${each} min`,
      `Dwa mocne odcinki po ${each} min w tempie progowym, 2 min truchtu między nimi.`,
      blocks,
    );
  }
  blocks.push(step(work(tempoMin)));
  blocks.push(cooldown(ctx));
  return assemble(
    ctx,
    "tempo",
    `Tempo progowe ${tempoMin} min`,
    `Ciągły odcinek ${tempoMin} min w tempie progowym. Podnosi tempo, które możesz utrzymać dłużej.`,
    blocks,
  );
}

export function cruiseIntervals(ctx: BuildContext, weeklyKm: number) {
  const reps = weeklyKm >= 40 ? 5 : 4;
  const t = ctx.paces.threshold;
  return assemble(
    ctx,
    "tempo",
    `Interwały progowe ${reps} × 6 min`,
    `${reps} odcinków po 6 min w tempie progowym z 1 min truchtu przerwy.`,
    [
      warmup(ctx, 10),
      {
        type: "repeat",
        count: reps,
        steps: [
          {
            kind: "work",
            label: "Tempo progowe",
            durationS: min(6),
            paceFast: t[0],
            paceSlow: t[1],
          },
          { kind: "recovery", label: "Trucht", durationS: min(1), paceFast: ctx.paces.easy[1], paceSlow: ctx.paces.easy[1] + 60 },
        ],
      },
      cooldown(ctx),
    ],
  );
}

export function intervals(ctx: BuildContext, weeklyKm: number) {
  const reps = Math.min(8, Math.max(4, Math.round(3 + weeklyKm / 10)));
  const repDistance = weeklyKm >= 40 && reps <= 6 ? 1000 : 800;
  const i = ctx.paces.interval;
  return assemble(
    ctx,
    "intervals",
    `Interwały ${reps} × ${repDistance} m`,
    `${reps} szybkich odcinków po ${repDistance} m w tempie VO2max, 2 min truchtu między nimi. Podnosi pułap tlenowy.`,
    [
      warmup(ctx, 12),
      strides(ctx, 3),
      {
        type: "repeat",
        count: reps,
        steps: [
          {
            kind: "work",
            label: `${repDistance} m szybko`,
            distanceM: repDistance,
            paceFast: i[0],
            paceSlow: i[1],
            note: "Tętno narasta powoli, kieruj się tempem",
          },
          { kind: "recovery", label: "Trucht", durationS: min(2), paceFast: ctx.paces.easy[1], paceSlow: ctx.paces.easy[1] + 60 },
        ],
      },
      cooldown(ctx, 10),
    ],
  );
}

export function fartlek(ctx: BuildContext, weeklyKm: number) {
  const reps = Math.min(10, Math.max(6, Math.round(5 + weeklyKm / 12)));
  return assemble(
    ctx,
    "fartlek",
    `Fartlek ${reps} × 1 min`,
    `${reps} razy 1 min mocniej i 1,5 min spokojnie. Dobry sposób na wprowadzenie szybszego biegania bez presji na tempo.`,
    [
      warmup(ctx, 10),
      {
        type: "repeat",
        count: reps,
        steps: [
          {
            kind: "work",
            label: "Szybciej",
            durationS: min(1),
            paceFast: ctx.paces.interval[1],
            paceSlow: ctx.paces.threshold[1],
          },
          easyStep(ctx, "recovery", "Spokojnie", min(1.5), [0.45, 0.72]),
        ],
      },
      cooldown(ctx),
    ],
  );
}

export function speedReps(ctx: BuildContext) {
  const r = ctx.paces.repetition;
  return assemble(
    ctx,
    "speed",
    "Szybkość: 8 × 200 m",
    "Krótkie, szybkie odcinki ze swobodną przerwą. Poprawiają ekonomię i dynamikę kroku.",
    [
      warmup(ctx, 12),
      strides(ctx, 3),
      {
        type: "repeat",
        count: 8,
        steps: [
          {
            kind: "work",
            label: "200 m szybko",
            distanceM: 200,
            paceFast: r[0],
            paceSlow: r[1],
          },
          { kind: "recovery", label: "Trucht lub marsz", durationS: 90, paceFast: ctx.paces.easy[1], paceSlow: ctx.paces.easy[1] + 90 },
        ],
      },
      cooldown(ctx, 10),
    ],
  );
}

export function progressionRun(ctx: BuildContext, minutes: number) {
  const easy = Math.round(minutes * 0.6);
  const mid = Math.round(minutes * 0.25);
  const fast = minutes - easy - mid;
  return assemble(
    ctx,
    "progression",
    "Bieg progresywny",
    `${minutes} min, tempo rośnie od spokojnego, przez maratońskie, do progowego.`,
    [
      step(easyStep(ctx, "easy", "Spokojnie", min(easy))),
      step({
        kind: "work",
        label: "Tempo maratońskie",
        durationS: min(mid),
        paceFast: ctx.paces.marathon[0],
        paceSlow: ctx.paces.marathon[1],
      }),
      step({
        kind: "work",
        label: "Tempo progowe",
        durationS: min(fast),
        paceFast: ctx.paces.threshold[0],
        paceSlow: ctx.paces.threshold[1],
      }),
    ],
  );
}

export function marathonPace(ctx: BuildContext, weeklyKm: number) {
  const each = Math.min(25, Math.max(12, Math.round(weeklyKm * 0.35)));
  return assemble(
    ctx,
    "marathon",
    `Tempo maratońskie 2 × ${each} min`,
    `Dwa odcinki po ${each} min w docelowym tempie maratońskim, 3 min truchtu przerwy.`,
    [
      warmup(ctx, 12),
      {
        type: "repeat",
        count: 2,
        steps: [
          {
            kind: "work",
            label: "Tempo maratońskie",
            durationS: min(each),
            paceFast: ctx.paces.marathon[0],
            paceSlow: ctx.paces.marathon[1],
          },
          { kind: "recovery", label: "Trucht", durationS: min(3), paceFast: ctx.paces.easy[1], paceSlow: ctx.paces.easy[1] + 60 },
        ],
      },
      cooldown(ctx, 10),
    ],
  );
}

export function restDay(): Workout {
  return {
    type: "rest",
    title: "Dzień odpoczynku",
    summary: "Dziś lepiej nie biegać. Spacer lub lekka mobilność są w porządku.",
    rationale: [],
    blocks: [],
    totalS: 0,
    totalM: 0,
  };
}
