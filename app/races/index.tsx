import { Link, Stack, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  Muted,
  Screen,
  Subtitle,
  Title,
} from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import {
  formatCountdown,
  parseRaceDate,
  resolveRacePhase,
} from "@/src/lib/coach/race-phase";
import { raceDistanceLabelPl } from "@/src/lib/labels";
import type { RaceEvent } from "@/src/lib/types";
import { colors, fonts } from "@/src/theme";

function MonthCalendar({
  races,
  month,
}: {
  races: RaceEvent[];
  month: Date;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const raceDays = new Set(
    races
      .filter((r) => {
        const d = parseRaceDate(r.date);
        return d.getFullYear() === year && d.getMonth() === m;
      })
      .map((r) => parseRaceDate(r.date).getDate()),
  );

  const cells: Array<number | null> = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdays = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: fonts.bodyBold, color: colors.text, fontSize: 15 }}>
        {month.toLocaleDateString("pl-PL", { month: "long", year: "numeric" })}
      </Text>
      <View style={{ flexDirection: "row" }}>
        {weekdays.map((d) => (
          <Text
            key={d}
            style={{
              flex: 1,
              textAlign: "center",
              color: colors.muted,
              fontSize: 11,
              fontFamily: fonts.bodyMed,
            }}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((day, i) => {
          const hasRace = day !== null && raceDays.has(day);
          return (
            <View
              key={i}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {day !== null ? (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: hasRace ? colors.primary : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyMed,
                      fontSize: 13,
                      color: hasRace ? colors.primaryText : colors.text,
                    }}
                  >
                    {day}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function RacesScreen() {
  const { races, saveRaces } = useAuth();
  const router = useRouter();
  const now = new Date();
  const sorted = [...races].sort((a, b) => a.date.localeCompare(b.date));

  async function setPrepare(id: string, on: boolean) {
    const next = races.map((r) => ({
      ...r,
      prepareForIt: on ? r.id === id : false,
    }));
    await saveRaces(next);
  }

  function removeRace(id: string) {
    const race = races.find((r) => r.id === id);
    Alert.alert(
      "Usunąć start?",
      race ? `„${race.name}” zniknie z kalendarza.` : "Tej pozycji nie da się cofnąć.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => {
            void saveRaces(races.filter((r) => r.id !== id));
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Starty",
          headerStyle: { backgroundColor: colors.bgElevated },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 22 },
        }}
      />
      <Screen testID="races-screen">
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <Card accent>
            <Title>Kalendarz startów</Title>
            <Muted>
              Dodaj bieg, na który się zapisałeś. Włącz „Przygotuj mnie”, a trener dopasuje treningi
              (build → peak → taper → start → regeneracja).
            </Muted>
            <Button
              testID="races-add"
              title="Dodaj start"
              onPress={() => router.push("/races/edit")}
            />
          </Card>

          <Card delay={40}>
            <MonthCalendar races={races} month={now} />
          </Card>

          {sorted.length === 0 ? (
            <Card delay={80}>
              <Muted>Brak zapisanych startów. Dodaj pierwszy, żeby zobaczyć odliczanie na ekranie Dziś.</Muted>
            </Card>
          ) : (
            sorted.map((race, i) => {
              const phase = resolveRacePhase(race, now);
              return (
                <Card key={race.id} delay={60 + i * 40} accent={race.prepareForIt}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Subtitle>{race.name}</Subtitle>
                      <Muted>
                        {`${parseRaceDate(race.date).toLocaleDateString("pl-PL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })} · ${raceDistanceLabelPl(race.distance)}`}
                      </Muted>
                      <Muted>{`${formatCountdown(phase.daysToRace)} · ${phase.phaseLabel}`}</Muted>
                      {race.prepareForIt ? <Badge tone="good">Aktywne przygotowanie</Badge> : null}
                    </View>
                  </View>
                  {race.notes ? <Muted>{race.notes}</Muted> : null}
                  <Button
                    title={race.prepareForIt ? "Wyłącz przygotowanie" : "Przygotuj mnie pod ten bieg"}
                    variant={race.prepareForIt ? "ghost" : "primary"}
                    onPress={() => void setPrepare(race.id, !race.prepareForIt)}
                  />
                  <Link href={{ pathname: "/races/edit", params: { id: race.id } }} asChild>
                    <Pressable>
                      {({ pressed }) => (
                        <Text
                          style={{
                            color: colors.primary,
                            fontFamily: fonts.bodyBold,
                            opacity: pressed ? 0.7 : 1,
                            textAlign: "center",
                            paddingVertical: 8,
                          }}
                        >
                          Edytuj
                        </Text>
                      )}
                    </Pressable>
                  </Link>
                  <Button title="Usuń" variant="danger" onPress={() => void removeRace(race.id)} />
                </Card>
              );
            })
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
