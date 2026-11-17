import { ScrollView, Text, View } from "react-native";
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
  const { runs, profile, vo2 } = useAuth();
  const { fitness, form, efficiency, series } = useAnalysis(runs, profile, vo2);
  const last7 = series.slice(-7).reduce((s, p) => s + p.load, 0);
  const last28 = series.slice(-28).reduce((s, p) => s + p.load, 0);

  return (
    <Screen>
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
        </Card>
      </ScrollView>
    </Screen>
  );
}
