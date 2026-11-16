"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { EfficiencySummary, Verdict } from "@/lib/analytics/efficiency";
import { cn } from "@/lib/utils";

const VERDICT_STYLE: Record<Verdict, string> = {
  good: "bg-emerald-100 text-emerald-800",
  ok: "bg-amber-100 text-amber-800",
  poor: "bg-red-100 text-red-800",
  unknown: "bg-slate-100 text-slate-700",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  good: "Dobrze",
  ok: "W normie",
  poor: "Do poprawy",
  unknown: "Brak danych",
};

const config = {
  metersPerBeat: { label: "Metry na uderzenie serca", color: "var(--chart-1)" },
  trend: { label: "Trend", color: "var(--chart-2)" },
} satisfies ChartConfig;

function ema(values: number[], alpha = 0.3) {
  const out: number[] = [];
  for (const v of values) out.push(out.length ? out[out.length - 1] + alpha * (v - out[out.length - 1]) : v);
  return out;
}

function Metric({
  label,
  value,
  unit,
  verdict,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  verdict?: Verdict;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center justify-between gap-2">
          {label}
          {verdict && <Badge className={cn("text-[11px]", VERDICT_STYLE[verdict])}>{VERDICT_LABEL[verdict]}</Badge>}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function EfficiencyCard({ efficiency }: { efficiency: EfficiencySummary }) {
  const trend = ema(efficiency.points.map((p) => p.metersPerBeat));
  const data = efficiency.points.map((p, i) => ({
    date: new Date(p.date).toLocaleDateString("pl-PL", { day: "numeric", month: "numeric" }),
    metersPerBeat: Math.round(p.metersPerBeat * 1000) / 1000,
    trend: Math.round(trend[i] * 1000) / 1000,
  }));
  const changePct = efficiency.change !== undefined ? efficiency.change * 100 : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardDescription>Efektywność biegu</CardDescription>
          <CardTitle className="flex flex-wrap items-center gap-3 text-xl leading-snug">
            {efficiency.headline}
            <Badge className={VERDICT_STYLE[efficiency.verdict]}>{VERDICT_LABEL[efficiency.verdict]}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.length >= 3 ? (
            <ChartContainer config={config} className="h-56 w-full">
              <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={32} />
                <YAxis
                  domain={["dataMin - 0.03", "dataMax + 0.03"]}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="metersPerBeat" stroke="var(--color-metersPerBeat)" strokeWidth={0} dot={{ r: 2.5, fill: "var(--color-metersPerBeat)" }} isAnimationActive={false} />
                <Line dataKey="trend" stroke="var(--color-trend)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">
              Potrzebuję co najmniej 3 spokojnych biegów z pomiarem tętna (20 minut lub dłużej), aby narysować wykres.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Każdy punkt to jeden spokojny bieg aerobowy. Im więcej metrów pokonujesz na jedno uderzenie serca, tym
            ekonomiczniej biegasz. Porównuję tylko biegi o podobnej intensywności (45–82% rezerwy tętna).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Metry na uderzenie"
          value={efficiency.current ? efficiency.current.toFixed(2).replace(".", ",") : "—"}
          unit="m"
          verdict={efficiency.change === undefined ? "unknown" : efficiency.verdict}
          hint={
            changePct !== undefined
              ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(1).replace(".", ",")}% względem poprzednich 4 tygodni.`
              : "Mediana z ostatnich 4 tygodni."
          }
        />
        <Metric
          label="Dryf tętna"
          value={efficiency.decoupling !== undefined ? efficiency.decoupling.toFixed(1).replace(".", ",") : "—"}
          unit="%"
          verdict={efficiency.decouplingVerdict}
          hint="Pa:HR w długich biegach (40+ min). Poniżej 5% oznacza dobrą wytrzymałość aerobową."
        />
        <Metric
          label="Kadencja"
          value={efficiency.cadence ? String(efficiency.cadence) : "—"}
          unit="kr/min"
          hint="Mediana z ostatnich 6 tygodni. Większość biegaczy rekreacyjnych mieści się w 160–180."
        />
        <Metric
          label="Długość kroku"
          value={efficiency.strideM ? efficiency.strideM.toFixed(2).replace(".", ",") : "—"}
          unit="m"
          hint="Wynika z tempa i kadencji. Rośnie razem z prędkością i siłą."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Venu 2 Plus nie mierzy samodzielnie czasu kontaktu z podłożem ani oscylacji pionowej (wymaga to dodatkowego
        czujnika, np. pasa HRM-Pro Plus lub Running Dynamics Pod), więc efektywność liczę z tętna, tempa i kadencji.
      </p>
    </div>
  );
}
