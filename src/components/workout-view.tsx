import type { StepKind, Workout, WorkoutStep } from "@/lib/types";
import { describeDuration, describeTarget } from "@/lib/coach/describe";
import { cn } from "@/lib/utils";

const KIND_STYLES: Record<StepKind, { bar: string; label: string }> = {
  warmup: { bar: "bg-sky-400", label: "Rozgrzewka" },
  easy: { bar: "bg-emerald-500", label: "Spokojnie" },
  work: { bar: "bg-orange-500", label: "Mocno" },
  recovery: { bar: "bg-amber-300", label: "Przerwa" },
  cooldown: { bar: "bg-sky-300", label: "Wyciszenie" },
};

function StepRow({ step, compact }: { step: WorkoutStep; compact?: boolean }) {
  const style = KIND_STYLES[step.kind];
  const target = describeTarget(step);
  return (
    <div className={cn("flex items-stretch gap-3", compact && "pl-1")}>
      <span className={cn("w-1.5 shrink-0 rounded-full", style.bar)} aria-hidden />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-medium">{step.label}</span>
          <span className="text-sm tabular-nums text-muted-foreground">{describeDuration(step)}</span>
        </div>
        {target && <p className="text-sm text-muted-foreground tabular-nums">{target}</p>}
        {step.note && <p className="text-xs text-muted-foreground">{step.note}</p>}
      </div>
    </div>
  );
}

export function WorkoutView({ workout }: { workout: Workout }) {
  if (workout.blocks.length === 0) return null;
  return (
    <ol className="flex flex-col gap-3" aria-label="Kroki treningu">
      {workout.blocks.map((block, i) =>
        block.type === "step" ? (
          <li key={i}>
            <StepRow step={block.step} />
          </li>
        ) : (
          <li key={i} className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-2 text-sm font-semibold">Powtórz {block.count} ×</p>
            <div className="flex flex-col gap-2">
              {block.steps.map((s, j) => (
                <StepRow key={j} step={s} compact />
              ))}
            </div>
          </li>
        ),
      )}
    </ol>
  );
}
