import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Muted, Screen, Subtitle, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { raceDistanceLabel } from "@/src/lib/coach/race-phase";
import { useAnalysis } from "@/src/lib/use-analysis";
import { colors, fonts } from "@/src/theme";

const SHORT: Record<string, string> = {
  rest: "Odp",
  recovery: "Regen",
  easy: "Spok",
  long: "Długi",
  tempo: "Tempo",
  cruise: "Cruise",
  intervals: "Int",
  fartlek: "Fartlek",
  speed: "Szyb",
  progression: "Prog",
  marathon: "MP",
  first: "Start",
};

export default function BlockPlanScreen() {
  const router = useRouter();
  const { runs, profile, vo2, races, feedback } = useAuth();
  const { blockPlan } = useAnalysis(runs, profile, vo2, races, feedback, {
    week: false,
    block: true,
  });

  if (!blockPlan) {
    return (
      <Screen>
        <Card>
          <Title>Brak aktywnego startu</Title>
          <Muted>
            Dodaj start w kalendarzu i włącz „Przygotuj mnie”, żeby zobaczyć plan blokowy do dnia
            biegu.
          </Muted>
          <Button title="Starty" onPress={() => router.push("/races")} />
          <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const { race, daysToRace, weeks, totalKm, totalTrainingDays } = blockPlan;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Card accent>
          <Badge tone="good">Plan blokowy</Badge>
          <Title>{race.name}</Title>
          <Muted>
            {`${raceDistanceLabel(race.distance)} · za ${daysToRace} dni · ${weeks.length} tyg.`}
          </Muted>
          <Muted>{`Suma planu: ~${totalKm.toFixed(0)} km · ${totalTrainingDays} treningów`}</Muted>
        </Card>

        {weeks.map((w) => (
          <Card key={w.weekIndex} delay={Math.min(w.weekIndex * 30, 200)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Subtitle>{`Tydzień ${w.weekIndex}`}</Subtitle>
              <Badge>{w.phaseLabel}</Badge>
            </View>
            <Muted>
              {`${w.from.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })} – ${w.to.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })} · ~${w.plannedKm.toFixed(0)} km · ${w.trainingDays} treningów`}
            </Muted>
            <View style={{ gap: 4, marginTop: 6 }}>
              {w.days.map((d) => (
                <View
                  key={d.isoDate}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ width: 36, color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>
                    {d.date.toLocaleDateString("pl-PL", { weekday: "short" })}
                  </Text>
                  <Badge tone={d.workoutType === "rest" ? "neutral" : "good"}>
                    {SHORT[d.workoutType] ?? d.workoutType}
                  </Badge>
                  <Text
                    style={{ flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 13 }}
                    numberOfLines={1}
                  >
                    {d.title}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ))}

        <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
