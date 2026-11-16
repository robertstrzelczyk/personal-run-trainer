import { ScrollView, Text, View } from "react-native";
import { Card, Muted, Screen, Subtitle, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { formatMinutes } from "@/src/lib/analytics/physiology";
import { FORM_LABELS } from "@/src/lib/analytics/load";
import { useAnalysis } from "@/src/lib/use-analysis";
import { colors } from "@/src/theme";

function StepRow({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontWeight: "600", color: colors.text }}>{label}</Text>
      <Text style={{ color: colors.muted, marginTop: 2 }}>{detail}</Text>
    </View>
  );
}

export default function TodayScreen() {
  const { runs, profile, vo2 } = useAuth();
  const { recommendation, form, fitness } = useAnalysis(runs, profile, vo2);
  const workout = recommendation.workout;

  if (!runs.length) {
    return (
      <Screen>
        <Card>
          <Title>Witaj</Title>
          <Muted>
            Zsynchronizuj biegi z Garmin Connect w zakładce Ustawienia (Personal API Key). Potem zobaczysz
            stan wytrenowania, obciążenie i trening na dziś — rzeczy, których Venu 2 Plus nie pokazuje.
          </Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Card>
          <Muted>
            {`${recommendation.forTomorrow ? "Jutro, " : "Dziś, "}${recommendation.forDate.toLocaleDateString(
              "pl-PL",
              { weekday: "long", day: "numeric", month: "long" },
            )}`}
          </Muted>
          <Title>{workout.title}</Title>
          <Muted>{workout.summary}</Muted>
          {workout.type !== "rest" && (
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <Muted>{`Czas: ${formatMinutes(workout.totalS)}`}</Muted>
              <Muted>{`Dystans ~${(workout.totalM / 1000).toFixed(1)} km`}</Muted>
            </View>
          )}
        </Card>

        <Card>
          <Subtitle>Dlaczego ten trening</Subtitle>
          {workout.rationale.map((r) => (
            <Muted key={r}>{`• ${r}`}</Muted>
          ))}
        </Card>

        {workout.type !== "rest" && (
          <Card>
            <Subtitle>Kroki</Subtitle>
            {workout.blocks.map((block, i) => {
              if (block.type === "repeat") {
                return (
                  <View key={i}>
                    <Text style={{ fontWeight: "700", marginTop: 8, color: colors.text }}>
                      {`Powtórz ${block.count}×`}
                    </Text>
                    {block.steps.map((s, j) => (
                      <StepRow
                        key={`${i}-${j}`}
                        label={s.label}
                        detail={[
                          s.durationS ? formatMinutes(s.durationS) : null,
                          s.distanceM ? `${Math.round(s.distanceM)} m` : null,
                          s.hrLow && s.hrHigh ? `HR ${s.hrLow}–${s.hrHigh}` : null,
                          s.note,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                    ))}
                  </View>
                );
              }
              const s = block.step;
              return (
                <StepRow
                  key={i}
                  label={s.label}
                  detail={[
                    s.durationS ? formatMinutes(s.durationS) : null,
                    s.distanceM ? `${Math.round(s.distanceM)} m` : null,
                    s.hrLow && s.hrHigh ? `HR ${s.hrLow}–${s.hrHigh}` : null,
                    s.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              );
            })}
          </Card>
        )}

        <Card>
          <Subtitle>Szybki kontekst</Subtitle>
          <Muted>{`Forma: ${FORM_LABELS[form.status]} (TSB ${form.tsb.toFixed(0)})`}</Muted>
          <Muted>
            {fitness.vo2max
              ? `VO2max: ${fitness.vo2max.toFixed(1)} (${fitness.vo2Source})`
              : "VO2max: brak danych"}
          </Muted>
          <Muted>{`Km / tydzień (ok.): ${recommendation.weeklyKm.toFixed(0)}`}</Muted>
        </Card>
      </ScrollView>
    </Screen>
  );
}
