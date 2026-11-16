"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { FitnessSummary } from "@/lib/analytics/fitness";
import { LEVEL_LABELS, formatDuration, formatPace } from "@/lib/analytics/physiology";

const SEGMENT_COLORS = ["bg-rose-300", "bg-amber-300", "bg-lime-400", "bg-emerald-500", "bg-teal-600"];
const LEVEL_ORDER = Object.values(LEVEL_LABELS);

function LevelScale({ fitness }: { fitness: FitnessSummary }) {
  if (!fitness.level || fitness.vo2max === undefined) return null;
  const t = fitness.level.thresholds;
  const min = t[0] - 8;
  const max = t[3] + 8;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const edges = [min, ...t, max];
  return (
    <div className="flex flex-col gap-1.5" role="img" aria-label={`Poziom: ${fitness.level.label}`}>
      <div className="relative">
        <div className="flex h-3 overflow-hidden rounded-full">
          {SEGMENT_COLORS.map((c, i) => (
            <div key={c} className={c} style={{ width: `${pct(edges[i + 1]) - pct(edges[i])}%` }} />
          ))}
        </div>
        <div
          className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded-full bg-foreground ring-2 ring-background"
          style={{ left: `${pct(fitness.vo2max)}%` }}
        />
      </div>
      <div className="flex text-[11px] text-muted-foreground">
        {LEVEL_ORDER.map((label, i) => (
          <span
            key={label}
            className={i === fitness.level!.index ? "font-semibold text-foreground" : ""}
            style={{ width: `${pct(edges[i + 1]) - pct(edges[i])}%` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const chartConfig = {
  value: { label: "VO2max (szacunek z biegu)", color: "var(--chart-1)" },
  smooth: { label: "Trend", color: "var(--chart-2)" },
} satisfies ChartConfig;

function smooth(points: Array<{ value: number }>, alpha = 0.25) {
  const out: number[] = [];
  for (const p of points) {
    out.push(out.length ? out[out.length - 1] + alpha * (p.value - out[out.length - 1]) : p.value);
  }
  return out;
}

export function FitnessCard({ fitness, age }: { fitness: FitnessSummary; age: number }) {
  const smoothed = smooth(fitness.runPoints);
  const data = fitness.runPoints.map((p, i) => ({
    date: new Date(p.date).toLocaleDateString("pl-PL", { day: "numeric", month: "numeric" }),
    value: Math.round(p.value * 10) / 10,
    smooth: Math.round(smoothed[i] * 10) / 10,
  }));
  const trend = fitness.trend;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardDescription>Stopień wytrenowania</CardDescription>
          <CardTitle className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="text-5xl font-bold tabular-nums">
              {fitness.vo2max !== undefined ? fitness.vo2max.toFixed(1).replace(".", ",") : "—"}
            </span>
            <span className="pb-1 text-sm font-normal text-muted-foreground">ml/kg/min VO2max</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {fitness.level && <Badge>{fitness.level.label} dla wieku {age} lat</Badge>}
            <Badge variant="outline">
              {fitness.vo2Source === "garmin" ? "Wartość z Garmin Connect" : "Szacunek aplikacji z tętna i tempa"}
            </Badge>
            {trend !== undefined && (
              <Badge variant="outline" className="gap-1">
                {trend > 0.3 ? <ArrowUpRight className="size-3" /> : trend < -0.3 ? <ArrowDownRight className="size-3" /> : <Minus className="size-3" />}
                {trend > 0 ? "+" : ""}
                {trend.toFixed(1).replace(".", ",")} vs. poprzednie 6 tyg.
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <LevelScale fitness={fitness} />
          {data.length >= 3 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Szacunek VO2max z kolejnych biegów</p>
              <ChartContainer config={chartConfig} className="h-52 w-full">
                <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={32} />
                  <YAxis domain={["dataMin - 3", "dataMax + 3"]} tickLine={false} axisLine={false} width={32} tickFormatter={(v: number) => String(Math.round(v))} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="value" stroke="var(--color-value)" strokeWidth={0} dot={{ r: 2.5, fill: "var(--color-value)" }} isAnimationActive={false} />
                  <Line dataKey="smooth" stroke="var(--color-smooth)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ChartContainer>
              <p className="mt-2 text-xs text-muted-foreground">
                Pojedynczy bieg jest szacunkiem: zależy od pogody, wzniesień i pomiaru tętna z nadgarstka. Liczy się trend.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Potrzeba co najmniej kilku biegów z pomiarem tętna (minimum 12 minut, intensywność powyżej 60% rezerwy
              tętna), aby oszacować VO2max.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Prognozy wyników</CardTitle>
            <CardDescription>Dla bieżącego poziomu (VDOT {fitness.vdot?.toFixed(1).replace(".", ",") ?? "—"})</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              {fitness.predictions.map((p) => (
                <div key={p.label} className="contents">
                  <dt className="text-muted-foreground">{p.label}</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatDuration(p.timeS)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        {fitness.paces && (
          <Card>
            <CardHeader>
              <CardTitle>Tempa treningowe</CardTitle>
              <CardDescription>min/km, wyliczone z Twojego poziomu</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                {(
                  [
                    ["Spokojne", fitness.paces.easy],
                    ["Maratońskie", fitness.paces.marathon],
                    ["Progowe", fitness.paces.threshold],
                    ["Interwałowe", fitness.paces.interval],
                    ["Szybkość", fitness.paces.repetition],
                  ] as const
                ).map(([label, [fast, slow]]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-semibold tabular-nums">
                      {formatPace(fast)}–{formatPace(slow)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
