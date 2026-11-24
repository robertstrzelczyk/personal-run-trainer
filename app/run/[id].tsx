import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { TrackMap } from "@/src/components/TrackMap";
import { Badge, Button, Card, Muted, Screen, Subtitle, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { formatDuration, formatPace, paceOfRun } from "@/src/lib/analytics/physiology";
import { formatZoneMinutes, runHrStats } from "@/src/lib/analytics/hr-zones";
import { activitySport, SPORT_LABELS } from "@/src/lib/sport";
import type { RunFeedback } from "@/src/lib/types";
import { colors, fonts } from "@/src/theme";

const BEST_LABELS: Record<string, string> = {
  "1000": "1 km",
  "3000": "3 km",
  "5000": "5 km",
  "10000": "10 km",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: "40%", gap: 2 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMed }}>{label}</Text>
      <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 22 }}>{value}</Text>
    </View>
  );
}

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { runs, profile, feedback, setRunFeedback } = useAuth();
  const run = runs.find((r) => r.id === id);
  const fb = run ? feedback[run.id] : undefined;

  if (!run) {
    return (
      <Screen>
        <Card>
          <Title>Nie znaleziono biegu</Title>
          <Muted>Ten bieg nie jest w lokalnej pamięci telefonu.</Muted>
          <Button title="Wróć" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const hr = runHrStats(run, profile);
  const pace = paceOfRun(run);
  const sport = activitySport(run);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Card accent>
          <Badge>{SPORT_LABELS[sport]}</Badge>
          <Title>{run.name ?? SPORT_LABELS[sport]}</Title>
          <Muted>
            {new Date(run.startTime).toLocaleString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Muted>
        </Card>

        <Card delay={40}>
          <Subtitle>Podsumowanie</Subtitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Stat label="Dystans" value={`${(run.distanceM / 1000).toFixed(2)} km`} />
            <Stat label="Czas" value={formatDuration(run.durationS)} />
            <Stat label="Tempo" value={`${formatPace(pace)}/km`} />
            <Stat
              label="Kadencja"
              value={run.avgCadence ? `${run.avgCadence} kroków/min` : "—"}
            />
            <Stat
              label="Przewyższenie"
              value={run.ascentM !== undefined ? `${Math.round(run.ascentM)} m` : "—"}
            />
            <Stat
              label="Dryf tempa/tętna"
              value={
                run.decouplingPct !== undefined ? `${run.decouplingPct.toFixed(1)}%` : "—"
              }
            />
          </View>
        </Card>

        <Card delay={80}>
          <Subtitle>Tętno</Subtitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Stat label="Średnie" value={hr.avgHr ? `${hr.avgHr} ud./min` : "—"} />
            <Stat label="Maksymalne" value={hr.maxHr ? `${hr.maxHr} ud./min` : "—"} />
            <Stat label="Minimalne" value={hr.minHr ? `${hr.minHr} ud./min` : "—"} />
          </View>
          {!run.hrHist ? (
            <Muted>Brak szczegółowego rozkładu tętna dla tego biegu.</Muted>
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Muted>{`Strefy tętna (%HRmax, max ${profile.maxHr})`}</Muted>
              {hr.zones.map((z) => (
                <View key={z.id} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bodyMed, fontSize: 13 }}>
                      {`Z${z.id} · ${z.label} (${z.bpmLow}–${z.bpmHigh})`}
                    </Text>
                    <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
                      {`${formatZoneMinutes(z.seconds)} · ${z.percent.toFixed(0)}%`}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: colors.bgElevated,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.min(100, Math.max(z.percent, z.seconds > 0 ? 2 : 0))}%` as `${number}%`,
                        height: "100%",
                        backgroundColor: z.color,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {run.best && Object.keys(run.best).length > 0 && (
          <Card delay={120}>
            <Subtitle>Najlepsze odcinki</Subtitle>
            {Object.entries(run.best)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([dist, timeS]) => (
                <View
                  key={dist}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.bodyMed }}>
                    {BEST_LABELS[dist] ?? `${dist} m`}
                  </Text>
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>
                    {formatDuration(timeS)}
                  </Text>
                </View>
              ))}
          </Card>
        )}

        {run.track && run.track.length >= 2 ? (
          <Card delay={140}>
            <Subtitle>Trasa</Subtitle>
            <Muted>Zapis GPS z FIT (uproszczony).</Muted>
            <TrackMap track={run.track} />
          </Card>
        ) : null}

        <Card delay={160}>
          <Subtitle>Samopoczucie (RPE)</Subtitle>
          <Muted>1 = bardzo lekko, 5 = maksymalnie ciężko. Wpływa na kolejne rekomendacje.</Muted>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            {([1, 2, 3, 4, 5] as const).map((n) => {
              const active = fb?.rpe === n;
              return (
                <Pressable
                  key={n}
                  onPress={() =>
                    void setRunFeedback(run.id, { rpe: n } satisfies RunFeedback)
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: active ? colors.primary : colors.bgElevated,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyBold,
                      color: active ? colors.primaryText : colors.text,
                    }}
                  >
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Button title="Wróć do listy" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
