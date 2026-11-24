import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Muted, Screen, Subtitle, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { formatMinutes } from "@/src/lib/analytics/physiology";
import { FORM_LABELS } from "@/src/lib/analytics/load";
import { describeDuration, describeTarget } from "@/src/lib/coach/describe";
import { shareWorkoutFit, shareWorkoutText } from "@/src/lib/coach/share-workout";
import { useAnalysis } from "@/src/lib/use-analysis";
import { colors, fonts } from "@/src/theme";

const WORKOUT_TYPE_PL: Record<string, string> = {
  rest: "Odpoczynek",
  recovery: "Regeneracja",
  easy: "Spokojny",
  long: "Długi",
  tempo: "Tempo",
  intervals: "Interwały",
  fartlek: "Fartlek",
  speed: "Szybkość",
  progression: "Progresja",
  marathon: "Maratoński",
  first: "Pierwszy bieg",
};

export default function WorkoutDetailScreen() {
  const { when } = useLocalSearchParams<{ when: string }>();
  const router = useRouter();
  const { runs, profile, vo2, races } = useAuth();
  const { schedule, form } = useAnalysis(runs, profile, vo2, races);
  const [busy, setBusy] = useState<"text" | "fit" | null>(null);

  const key = when === "tomorrow" ? "tomorrow" : when === "today" ? "today" : null;
  if (!key) {
    return (
      <Screen>
        <Card>
          <Title>Nieznany trening</Title>
          <Muted>Otwórz propozycję z ekranu Dziś.</Muted>
          <Button title="Wróć" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const rec = schedule[key];
  const workout = rec.workout;
  const dayLabel = key === "tomorrow" ? "Jutro" : "Dziś";

  const onShareText = async () => {
    try {
      setBusy("text");
      await shareWorkoutText(workout, `${dayLabel} · ${workout.title}`);
    } catch (e) {
      Alert.alert("Nie udało się udostępnić", e instanceof Error ? e.message : "Spróbuj ponownie.");
    } finally {
      setBusy(null);
    }
  };

  const onShareFit = async () => {
    try {
      setBusy("fit");
      await shareWorkoutFit(workout, rec.forDate);
    } catch (e) {
      Alert.alert("Eksport FIT", e instanceof Error ? e.message : "Spróbuj ponownie.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Card accent>
          <Badge>{dayLabel}</Badge>
          <Muted>
            {rec.forDate.toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Muted>
          <Title>{workout.title}</Title>
          <Muted>{workout.summary}</Muted>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            <Badge tone="good">{WORKOUT_TYPE_PL[workout.type] ?? workout.type}</Badge>
            {rec.targetAssessment ? <Badge>{rec.targetAssessment.label}</Badge> : null}
            {workout.type !== "rest" && (
              <>
                <Muted>{formatMinutes(workout.totalS)}</Muted>
                <Muted>{`~${(workout.totalM / 1000).toFixed(1)} km`}</Muted>
              </>
            )}
          </View>
        </Card>

        <Card delay={60}>
          <Subtitle>Dlaczego ten plan</Subtitle>
          {workout.rationale.map((r) => (
            <Muted key={r}>{`• ${r}`}</Muted>
          ))}
          <Muted>{`Forma: ${FORM_LABELS[form.status]} (TSB ${form.tsb.toFixed(0)})`}</Muted>
          <Muted>{`Km / tydzień (ok.): ${rec.weeklyKm.toFixed(0)}`}</Muted>
          {rec.daysSinceLast !== undefined && (
            <Muted>{`Dni od ostatniego biegu: ${rec.daysSinceLast}`}</Muted>
          )}
        </Card>

        {workout.type !== "rest" && (
          <Card delay={100}>
            <Subtitle>Szczegółowe kroki</Subtitle>
            {workout.blocks.map((block, i) => {
              if (block.type === "repeat") {
                return (
                  <View key={i} style={{ marginTop: 8, gap: 4 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>
                      {`Blok ${i + 1}: powtórz ${block.count}×`}
                    </Text>
                    {block.steps.map((s, j) => (
                      <View
                        key={`${i}-${j}`}
                        style={{
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                          gap: 2,
                        }}
                      >
                        <Text style={{ fontFamily: fonts.bodyBold, color: colors.text }}>
                          {s.label}
                        </Text>
                        <Muted>{describeDuration(s)}</Muted>
                        {describeTarget(s) ? <Muted>{describeTarget(s)}</Muted> : null}
                        {s.note ? <Muted>{s.note}</Muted> : null}
                      </View>
                    ))}
                  </View>
                );
              }
              const s = block.step;
              return (
                <View
                  key={i}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    gap: 2,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyBold, color: colors.text }}>
                    {`${i + 1}. ${s.label}`}
                  </Text>
                  <Muted>{describeDuration(s)}</Muted>
                  {describeTarget(s) ? <Muted>{describeTarget(s)}</Muted> : null}
                  {s.note ? <Muted>{s.note}</Muted> : null}
                </View>
              );
            })}
          </Card>
        )}

        {rec.alternative && (
          <Card delay={140}>
            <Subtitle>Alternatywa</Subtitle>
            <Muted>{rec.alternative.title}</Muted>
            <Muted>{rec.alternative.summary}</Muted>
            {rec.alternative.type !== "rest" && (
              <Muted>
                {`${formatMinutes(rec.alternative.totalS)} · ~${(rec.alternative.totalM / 1000).toFixed(1)} km`}
              </Muted>
            )}
          </Card>
        )}

        <Card delay={160}>
          <Subtitle>Udostępnij</Subtitle>
          <Muted>Tekst do notatek albo plik FIT do skopiowania na zegarek.</Muted>
          <View style={{ gap: 8, marginTop: 4 }}>
            <Button
              title={busy === "text" ? "Udostępnianie…" : "Udostępnij jako tekst"}
              onPress={onShareText}
              disabled={busy !== null}
            />
            {workout.type !== "rest" && (
              <Button
                title={busy === "fit" ? "Eksport…" : "Eksportuj FIT na zegarek"}
                variant="ghost"
                onPress={onShareFit}
                disabled={busy !== null}
              />
            )}
          </View>
        </Card>

        <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
