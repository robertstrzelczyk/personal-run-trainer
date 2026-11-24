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
import type { AdherenceStatus } from "@/src/lib/coach/adherence";
import { formatCountdown, raceDistanceLabel } from "@/src/lib/coach/race-phase";
import { VO2_SOURCE_LABELS } from "@/src/lib/labels";
import { useAnalysis } from "@/src/lib/use-analysis";
import type { Recommendation } from "@/src/lib/coach/recommend";
import type { WorkoutType } from "@/src/lib/types";
import { colors, fonts } from "@/src/theme";

const WORKOUT_SHORT: Record<WorkoutType, string> = {
  rest: "Rest",
  recovery: "Regen",
  easy: "Easy",
  long: "Long",
  tempo: "Tempo",
  intervals: "Int",
  fartlek: "Fartlek",
  speed: "Speed",
  progression: "Prog",
  marathon: "MP",
  first: "Start",
};

function adherenceTone(status: AdherenceStatus): "good" | "warn" | "bad" | "neutral" {
  if (status === "matched" || status === "rest_ok") return "good";
  if (status === "partial") return "warn";
  if (status === "skipped" || status === "too_hard") return "bad";
  return "neutral";
}

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
  const { runs, profile, vo2, syncing, lastSync, races } = useAuth();
  const { schedule, form, fitness, racePhase, preparing, weekPlan, todayAdherence } = useAnalysis(
    runs,
    profile,
    vo2,
    races,
  );
  const { today, tomorrow, ranToday } = schedule;
  const focus = ranToday ? tomorrow : today;
  const focusWhen = ranToday ? "tomorrow" : "today";

  if (!runs.length) {
    return (
      <Screen testID="today-screen">
        <HeroCard>
          <Badge tone="good">Trener biegowy</Badge>
          <Title light>Witaj</Title>
          <Muted light>
            Zsynchronizuj biegi z Garmin Connect w zakładce Ustawienia (klucz Personal API). Potem
            zobaczysz formę, obciążenie i trening na dziś oraz jutro.
          </Muted>
        </HeroCard>
        <Link href="/races" asChild>
          <Pressable style={{ marginTop: 12 }}>
            {({ pressed }) => (
              <Card style={{ opacity: pressed ? 0.9 : 1 }}>
                <Subtitle>Kalendarz startów</Subtitle>
                <Muted>Dodaj bieg, na który się zapisałeś — trener przygotuje Cię pod datę startu.</Muted>
              </Card>
            )}
          </Pressable>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen testID="today-screen">
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {(syncing || lastSync) && (
          <Muted>
            {syncing
              ? "Automatyczna synchronizacja z Garmin…"
              : `Ostatnia sync: ${new Date(lastSync!).toLocaleString("pl-PL")}`}
          </Muted>
        )}

        <Link href="/races" asChild>
          <Pressable>
            {({ pressed }) => (
              <Card accent={Boolean(preparing)} delay={0} style={{ opacity: pressed ? 0.9 : 1 }}>
                {preparing && racePhase ? (
                  <>
                    <Badge tone="good">Przygotowanie pod start</Badge>
                    <Subtitle>{preparing.name}</Subtitle>
                    <Muted>
                      {`${raceDistanceLabel(preparing.distance)} · ${formatCountdown(racePhase.daysToRace)} · ${racePhase.phaseLabel}`}
                    </Muted>
                    {today.targetAssessment ? (
                      <Muted>{`Cel czasowy: ${today.targetAssessment.label}`}</Muted>
                    ) : null}
                    <Muted>Dotknij, aby zarządzać startami</Muted>
                  </>
                ) : (
                  <>
                    <Subtitle>Kalendarz startów</Subtitle>
                    <Muted>
                      {races.length
                        ? `Masz ${races.length} ${races.length === 1 ? "start" : "starty"} — włącz „Przygotuj mnie”, żeby trener celował w datę biegu.`
                        : "Dodaj bieg, na który się zapisałeś. Trener zaproponuje taper i przygotowania."}
                    </Muted>
                  </>
                )}
              </Card>
            )}
          </Pressable>
        </Link>

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

        <Card delay={40}>
          <Subtitle>Plan vs wykonanie (dziś)</Subtitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Badge tone={adherenceTone(todayAdherence.status)}>{todayAdherence.label}</Badge>
            <Muted>{today.workout.title}</Muted>
          </View>
          <Muted>{todayAdherence.detail}</Muted>
          {todayAdherence.doneDistanceM > 0 && (
            <Muted>
              {`Wykonane: ${(todayAdherence.doneDistanceM / 1000).toFixed(1)} km · ${formatMinutes(todayAdherence.doneDurationS)}`}
            </Muted>
          )}
        </Card>

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

        <Card delay={100}>
          <Subtitle>Plan na 7 dni</Subtitle>
          <Muted>
            {`~${weekPlan.plannedKm.toFixed(0)} km · ${weekPlan.trainingDays} treningów (cel: ${weekPlan.daysPerWeekTarget}/tyg.)`}
          </Muted>
          <View style={{ gap: 6, marginTop: 6 }}>
            {weekPlan.days.map((d) => {
              const weekday = d.date.toLocaleDateString("pl-PL", { weekday: "short" });
              const dayNum = d.date.getDate();
              return (
                <View
                  key={d.isoDate}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      width: 52,
                      fontFamily: fonts.bodyBold,
                      color: d.isToday ? colors.primary : colors.text,
                      fontSize: 13,
                    }}
                  >
                    {d.isToday ? "Dziś" : `${weekday} ${dayNum}`}
                  </Text>
                  <Badge tone={d.workoutType === "rest" ? "neutral" : "good"}>
                    {WORKOUT_SHORT[d.workoutType]}
                  </Badge>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: fonts.body,
                      color: colors.text,
                      fontSize: 13,
                    }}
                    numberOfLines={1}
                  >
                    {d.title}
                  </Text>
                  {d.workoutType !== "rest" ? (
                    <Muted>{`${d.plannedKm.toFixed(1)} km`}</Muted>
                  ) : (
                    <Muted>—</Muted>
                  )}
                </View>
              );
            })}
          </View>
        </Card>

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
