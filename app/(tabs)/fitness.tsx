import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  ChartRangePicker,
  MultiLineChart,
  SimpleBarChart,
  useChartRange,
  useChartWindow,
} from "@/src/components/charts";
import { Card, Muted, Screen, Subtitle, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { FORM_LABELS } from "@/src/lib/analytics/load";
import { formatPace } from "@/src/lib/analytics/physiology";
import { VO2_SOURCE_LABELS } from "@/src/lib/labels";
import { useAnalysis } from "@/src/lib/use-analysis";
import { colors, fonts } from "@/src/theme";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: "40%", gap: 2 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMed }}>{label}</Text>
      <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 22 }}>{value}</Text>
    </View>
  );
}

export default function FitnessScreen() {
  const { runs, profile, vo2, races, feedback } = useAuth();
  const { fitness, form, efficiency, series } = useAnalysis(runs, profile, vo2, races, feedback, {
    week: false,
  });
  const [range, setRange] = useChartRange(28);
  const loadWindow = useChartWindow(series, range);
  const last7 = series.slice(-7).reduce((s, p) => s + p.load, 0);
  const last28 = series.slice(-28).reduce((s, p) => s + p.load, 0);

  const loadLines = useMemo(
    () => [
      {
        label: "CTL (forma)",
        color: colors.primary,
        data: loadWindow.map((p) => ({ value: Math.round(p.ctl * 10) / 10, date: p.date })),
      },
      {
        label: "ATL (zmęczenie)",
        color: colors.warn,
        data: loadWindow.map((p) => ({ value: Math.round(p.atl * 10) / 10, date: p.date })),
      },
      {
        label: "TSB (świeżość)",
        color: colors.chartBlue,
        data: loadWindow.map((p) => ({ value: Math.round(p.tsb * 10) / 10, date: p.date })),
      },
    ],
    [loadWindow],
  );

  const loadBars = useMemo(
    () =>
      loadWindow.map((p) => ({
        value: Math.round(p.load * 10) / 10,
        label: p.date.slice(8),
      })),
    [loadWindow],
  );

  const vo2Window = useMemo(() => {
    const pts = fitness.runPoints;
    if (!pts.length) return [];
    const end = pts[pts.length - 1].date;
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() - (range - 1));
    const startKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    return pts.filter((p) => p.date >= startKey);
  }, [fitness.runPoints, range]);

  const vo2Line = useMemo(
    () => [
      {
        label: "VO2 (szacunek)",
        color: colors.primary,
        data: vo2Window.map((p) => ({ value: Math.round(p.value * 10) / 10, date: p.date })),
      },
    ],
    [vo2Window],
  );

  const effWindow = useMemo(() => {
    const pts = efficiency.points;
    if (!pts.length) return [];
    const end = pts[pts.length - 1].date;
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() - (range - 1));
    const startKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    return pts.filter((p) => p.date >= startKey);
  }, [efficiency.points, range]);

  const effLine = useMemo(
    () => [
      {
        label: "m / uderzenie",
        color: colors.accent,
        data: effWindow.map((p) => ({
          value: Math.round(p.metersPerBeat * 100) / 100,
          date: p.date,
        })),
      },
    ],
    [effWindow],
  );

  return (
    <Screen testID="fitness-screen">
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card accent>
          <Title>Stan wytrenowania</Title>
          <Muted>
            Venu 2 Plus nie pokazuje statusu jak Forerunner/Fenix. Tu liczymy formę z obciążenia
            (TRIMP → CTL/ATL/TSB).
          </Muted>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
            <Stat label="Status" value={FORM_LABELS[form.status]} />
            <Stat label="Forma (CTL)" value={form.ctl.toFixed(0)} />
            <Stat label="Zmęczenie (ATL)" value={form.atl.toFixed(0)} />
            <Stat label="Świeżość (TSB)" value={form.tsb.toFixed(0)} />
            <Stat label="Obciążenie 7 dni" value={last7.toFixed(0)} />
            <Stat label="Obciążenie 28 dni" value={last28.toFixed(0)} />
            <Stat
              label="Stosunek 7/28"
              value={form.acwr !== undefined ? form.acwr.toFixed(2) : "—"}
            />
          </View>
        </Card>

        <Card delay={40}>
          <Subtitle>Wykresy formy</Subtitle>
          <ChartRangePicker value={range} onChange={setRange} testID="fitness-chart-range" />
          <Muted>CTL / ATL / TSB</Muted>
          <MultiLineChart series={loadLines} emptyLabel="Zsynchronizuj biegi, aby zobaczyć formę." />
          <Muted>Obciążenie dzienne (TRIMP)</Muted>
          <SimpleBarChart data={loadBars} emptyLabel="Brak obciążenia w wybranym zakresie." />
        </Card>

        <Card delay={80}>
          <Subtitle>Stopień wytrenowania (VO2 / VDOT)</Subtitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Stat label="VO2max" value={fitness.vo2max ? fitness.vo2max.toFixed(1) : "—"} />
            <Stat label="Źródło" value={VO2_SOURCE_LABELS[fitness.vo2Source]} />
            <Stat label="VDOT" value={fitness.vdot ? fitness.vdot.toFixed(1) : "—"} />
            <Stat label="Poziom" value={fitness.level?.label ?? "—"} />
          </View>
          {fitness.paces && (
            <View style={{ marginTop: 8, gap: 4 }}>
              <Muted>{`Łatwe: ${formatPace(fitness.paces.easy[0])}–${formatPace(fitness.paces.easy[1])}/km`}</Muted>
              <Muted>{`Próg: ${formatPace(fitness.paces.threshold[0])}–${formatPace(fitness.paces.threshold[1])}/km`}</Muted>
              <Muted>{`Interwały: ${formatPace(fitness.paces.interval[0])}–${formatPace(fitness.paces.interval[1])}/km`}</Muted>
            </View>
          )}
          {fitness.predictions.map((p: { label: string; timeS: number }) => (
            <Muted key={p.label}>
              {`${p.label}: ${Math.floor(p.timeS / 60)}:${String(Math.round(p.timeS % 60)).padStart(2, "0")}`}
            </Muted>
          ))}
          <Muted>Trend VO2 z biegów</Muted>
          <MultiLineChart series={vo2Line} emptyLabel="Za mało szacunków VO2 do wykresu." />
        </Card>

        <Card delay={140}>
          <Subtitle>Efektywność biegu</Subtitle>
          <Muted>{efficiency.headline}</Muted>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
            <Stat
              label="m / uderzenie"
              value={efficiency.current ? efficiency.current.toFixed(2) : "—"}
            />
            <Stat
              label="Dryf tempa/tętna"
              value={
                efficiency.decoupling !== undefined ? `${efficiency.decoupling.toFixed(1)}%` : "—"
              }
            />
            <Stat label="Kadencja" value={efficiency.cadence ? `${efficiency.cadence}` : "—"} />
            <Stat
              label="Krok"
              value={efficiency.strideM ? `${efficiency.strideM.toFixed(2)} m` : "—"}
            />
          </View>
          <Muted>Metry na uderzenie serca</Muted>
          <MultiLineChart series={effLine} emptyLabel="Za mało biegów aerobowych do wykresu." />
        </Card>
      </ScrollView>
    </Screen>
  );
}
