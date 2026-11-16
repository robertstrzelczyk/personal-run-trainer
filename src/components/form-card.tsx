"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { FORM_LABELS, type FormState, type LoadPoint } from "@/lib/analytics/load";
import type { WeekBucket } from "@/lib/use-analysis";

const STATUS_HINTS: Record<FormState["status"], string> = {
  overload: "Ostatnie dni były bardzo obciążające. Zwolnij, żeby uniknąć kontuzji.",
  building: "Przewlekłe obciążenie rośnie: organizm adaptuje się do treningu.",
  maintaining: "Obciążenie jest stabilne. Dobry moment na utrzymanie lub ostrożne zwiększenie.",
  detraining: "Obciążenie spadło w ostatnich tygodniach. Wróć do regularności.",
  fresh: "Jesteś wypoczęty. To dobry moment na mocniejszy trening lub start.",
  unknown: "Zbyt mało danych: potrzeba co najmniej tygodnia historii.",
};

const loadConfig = {
  ctl: { label: "Forma długoterminowa (CTL)", color: "var(--chart-1)" },
  atl: { label: "Zmęczenie (ATL)", color: "var(--chart-2)" },
} satisfies ChartConfig;

const weekConfig = {
  km: { label: "Kilometry", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function FormCard({
  form,
  series,
  weeks,
}: {
  form: FormState;
  series: LoadPoint[];
  weeks: WeekBucket[];
}) {
  const data = series.slice(-84).map((p) => ({
    date: new Date(p.date).toLocaleDateString("pl-PL", { day: "numeric", month: "numeric" }),
    ctl: Math.round(p.ctl * 10) / 10,
    atl: Math.round(p.atl * 10) / 10,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardDescription>Forma i obciążenie</CardDescription>
          <CardTitle className="flex flex-wrap items-center gap-3 text-2xl">
            {FORM_LABELS[form.status]}
            <Badge variant="outline" className="tabular-nums">
              Świeżość {form.tsb >= 0 ? "+" : ""}
              {form.tsb.toFixed(0)}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{STATUS_HINTS[form.status]}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ChartContainer config={loadConfig} className="h-56 w-full">
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={32} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="ctl" type="monotone" stroke="var(--color-ctl)" fill="var(--color-ctl)" fillOpacity={0.18} strokeWidth={2.5} isAnimationActive={false} />
              <Area dataKey="atl" type="monotone" stroke="var(--color-atl)" fill="none" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Forma (CTL)</dt>
              <dd className="text-lg font-semibold tabular-nums">{form.ctl.toFixed(0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Zmęczenie (ATL)</dt>
              <dd className="text-lg font-semibold tabular-nums">{form.atl.toFixed(0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Obciążenie 7/28 dni</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {form.acwr !== undefined ? form.acwr.toFixed(2).replace(".", ",") : "—"}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Obciążenie liczone metodą TRIMP z tętna. Zmęczenie to średnia z 7 dni, forma z 42 dni. Świeżość = forma
            minus zmęczenie. Wartości optymalne dla wzrostu formy to od −10 do −30, bezpieczne obciążenie 7/28 dni to
            0,8–1,3.
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Kilometry tygodniowo</CardTitle>
          <CardDescription>Ostatnie 8 tygodni</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={weekConfig} className="h-56 w-full">
            <BarChart data={weeks} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={28} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="km" fill="var(--color-km)" radius={4} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
