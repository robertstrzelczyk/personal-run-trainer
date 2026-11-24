import { Link } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Badge, Card, Muted, Screen, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { daysBetween, startOfDay } from "@/src/lib/analytics/load";
import { formatMinutes, formatPace } from "@/src/lib/analytics/physiology";
import { comparePlanToRuns, type AdherenceStatus } from "@/src/lib/coach/adherence";
import { recommendForDay } from "@/src/lib/coach/recommend";
import { activitySport, isRunning, SPORT_LABELS } from "@/src/lib/sport";
import { useAnalysis } from "@/src/lib/use-analysis";
import type { RunSummary } from "@/src/lib/types";
import { colors, fonts } from "@/src/theme";

function tone(status: AdherenceStatus): "good" | "warn" | "bad" | "neutral" {
  if (status === "matched" || status === "rest_ok") return "good";
  if (status === "partial") return "warn";
  if (status === "skipped" || status === "too_hard") return "bad";
  return "neutral";
}

export default function RunsScreen() {
  const { runs, profile, vo2, races, feedback } = useAuth();
  const { fitness } = useAnalysis(runs, profile, vo2, races, feedback);

  const adherenceByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof comparePlanToRuns>>();
    const runOnly = runs.filter(isRunning);
    for (const run of runOnly) {
      const day = startOfDay(run.startTime);
      const key = day.toDateString();
      if (map.has(key)) continue;
      const planned = recommendForDay(runOnly, profile, fitness, day, races, feedback);
      map.set(key, comparePlanToRuns(planned.workout, runOnly, day, profile));
    }
    return map;
  }, [runs, profile, fitness, races, feedback]);

  return (
    <Screen testID="runs-screen">
      <Title>Aktywności</Title>
      <Muted>
        {runs.length
          ? `${runs.length} zapisanych — przy biegach widać zgodność z planem dnia`
          : "Brak aktywności — zsynchronizuj Garmina w Ustawieniach."}
      </Muted>
      <FlatList
        data={runs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }: { item: RunSummary; index: number }) => {
          const pace = item.avgSpeed > 0 ? 1000 / item.avgSpeed : undefined;
          const sport = activitySport(item);
          const dayKey = startOfDay(item.startTime).toDateString();
          const adh = sport === "running" ? adherenceByDay.get(dayKey) : undefined;
          const isToday = daysBetween(new Date(item.startTime), new Date()) === 0;
          return (
            <Link href={`/run/${encodeURIComponent(item.id)}`} asChild>
              <Pressable>
                {({ pressed }) => (
                  <Card delay={Math.min(index * 40, 200)} style={{ opacity: pressed ? 0.85 : 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <Text
                        style={{
                          fontFamily: fonts.bodyBold,
                          color: colors.text,
                          fontSize: 16,
                          flex: 1,
                        }}
                      >
                        {item.name ?? SPORT_LABELS[sport]}
                      </Text>
                      <Text style={{ color: colors.primary, fontFamily: fonts.bodyMed, fontSize: 13 }}>
                        Szczegóły
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      <Badge>{SPORT_LABELS[sport]}</Badge>
                      {adh ? <Badge tone={tone(adh.status)}>{adh.label}</Badge> : null}
                      {isToday ? <Badge tone="good">Dziś</Badge> : null}
                      {feedback[item.id]?.rpe ? (
                        <Badge tone="neutral">{`RPE ${feedback[item.id]!.rpe}`}</Badge>
                      ) : null}
                    </View>
                    <Muted>
                      {new Date(item.startTime).toLocaleString("pl-PL", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Muted>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
                      <Muted>{`${(item.distanceM / 1000).toFixed(2)} km`}</Muted>
                      <Muted>{formatMinutes(item.durationS)}</Muted>
                      {pace !== undefined && <Muted>{`${formatPace(pace)}/km`}</Muted>}
                      {item.avgHr ? <Muted>{`${Math.round(item.avgHr)} ud./min`}</Muted> : null}
                    </View>
                  </Card>
                )}
              </Pressable>
            </Link>
          );
        }}
      />
    </Screen>
  );
}
