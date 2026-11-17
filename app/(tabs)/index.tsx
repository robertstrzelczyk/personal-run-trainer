import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Badge,
  Card,
  HeroCard,
  Muted,
  Screen,
  Subtitle,
  Title,
} from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { formatMinutes } from "@/src/lib/analytics/physiology";
import { FORM_LABELS } from "@/src/lib/analytics/load";
import { VO2_SOURCE_LABELS } from "@/src/lib/labels";
import { useAnalysis } from "@/src/lib/use-analysis";
import type { Recommendation } from "@/src/lib/coach/recommend";
import { colors, fonts } from "@/src/theme";

function WorkoutSummary({
  rec,
  compact = false,
}: {
  rec: Recommendation;
  compact?: boolean;
}) {
  const workout = rec.workout;
  return (
    <View style={{ gap: 8 }}>
      <Muted light={!compact}>
        {`${rec.forTomorrow ? "Jutro, " : "Dziś, "}${rec.forDate.toLocaleDateString("pl-PL", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}`}
      </Muted>
      <Title light={!compact}>{workout.title}</Title>
      <Muted light={!compact}>{workout.summary}</Muted>
      {workout.type !== "rest" && (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
          <Muted light={!compact}>{`Czas: ${formatMinutes(workout.totalS)}`}</Muted>
          <Muted light={!compact}>{`Dystans ~${(workout.totalM / 1000).toFixed(1)} km`}</Muted>
        </View>
      )}
      {compact && workout.rationale[0] ? <Muted>{`• ${workout.rationale[0]}`}</Muted> : null}
    </View>
  );
}

export default function TodayScreen() {
  const { runs, profile, vo2, syncing, lastSync } = useAuth();
  const { schedule, form, fitness } = useAnalysis(runs, profile, vo2);
  const { today, tomorrow, ranToday } = schedule;
  const focus = ranToday ? tomorrow : today;
  const focusWhen = ranToday ? "tomorrow" : "today";

  if (!runs.length) {
    return (
      <Screen>
        <HeroCard>
          <Badge tone="good">Trener biegowy</Badge>
          <Title light>Witaj</Title>
          <Muted light>
            Zsynchronizuj biegi z Garmin Connect w zakładce Ustawienia (klucz Personal API). Potem
            zobaczysz formę, obciążenie i trening na dziś oraz jutro.
          </Muted>
        </HeroCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {(syncing || lastSync) && (
          <Muted>
            {syncing
              ? "Automatyczna synchronizacja z Garmin…"
              : `Ostatnia sync: ${new Date(lastSync!).toLocaleString("pl-PL")}`}
          </Muted>
        )}

        <Link href={`/workout/${focusWhen}`} asChild>
          <Pressable>
            {({ pressed }) => (
              <View style={{ opacity: pressed ? 0.92 : 1 }}>
                <HeroCard>
                  {ranToday ? (
                    <Badge tone="good">Dziś już biegałeś — plan na jutro</Badge>
                  ) : (
                    <Badge>Trening na dziś</Badge>
                  )}
                  <WorkoutSummary rec={focus} />
                  <Text
                    style={{
                      marginTop: 4,
                      color: "rgba(255,255,255,0.9)",
                      fontFamily: fonts.bodyBold,
                      fontSize: 14,
                    }}
                  >
                    Zobacz pełne szczegóły →
                  </Text>
                </HeroCard>
              </View>
            )}
          </Pressable>
        </Link>

        {!ranToday && (
          <Link href="/workout/tomorrow" asChild>
            <Pressable>
              {({ pressed }) => (
                <Card delay={80} accent style={{ opacity: pressed ? 0.9 : 1 }}>
                  <Subtitle>Jutro</Subtitle>
                  <WorkoutSummary rec={tomorrow} compact />
                  <Muted>Dotknij, aby zobaczyć kroki, tempo i tętno</Muted>
                </Card>
              )}
            </Pressable>
          </Link>
        )}

        {ranToday && (
          <Link href="/workout/today" asChild>
            <Pressable>
              {({ pressed }) => (
                <Card delay={80} style={{ opacity: pressed ? 0.9 : 1 }}>
                  <Subtitle>Dziś</Subtitle>
                  <Badge tone="good">Zrobione / plan na dziś</Badge>
                  <Muted>{today.workout.title}</Muted>
                  <Muted>{today.workout.summary}</Muted>
                  <Muted>Dotknij, aby zobaczyć szczegóły planu</Muted>
                </Card>
              )}
            </Pressable>
          </Link>
        )}

        <Card delay={120}>
          <Subtitle>Szybki podgląd</Subtitle>
          <Muted>{`Główny trening: ${focus.workout.title}`}</Muted>
          {focus.workout.rationale.slice(0, 2).map((r) => (
            <Muted key={r}>{`• ${r}`}</Muted>
          ))}
          <Link href={`/workout/${focusWhen}`} asChild>
            <Pressable style={{ marginTop: 4 }}>
              {({ pressed }) => (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    paddingVertical: 13,
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 15 }}>
                    Pełne szczegóły treningu
                  </Text>
                </View>
              )}
            </Pressable>
          </Link>
        </Card>

        <Card delay={200}>
          <Subtitle>Szybki kontekst</Subtitle>
          <Muted>{`Forma: ${FORM_LABELS[form.status]} (TSB ${form.tsb.toFixed(0)})`}</Muted>
          <Muted>
            {fitness.vo2max
              ? `VO2max: ${fitness.vo2max.toFixed(1)} (${VO2_SOURCE_LABELS[fitness.vo2Source]})`
              : "VO2max: brak danych"}
          </Muted>
          <Muted>{`Km / tydzień (ok.): ${focus.weeklyKm.toFixed(0)}`}</Muted>
        </Card>
      </ScrollView>
    </Screen>
  );
}
