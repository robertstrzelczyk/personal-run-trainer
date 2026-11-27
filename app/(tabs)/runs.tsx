import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Badge, Card, Muted, Screen, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { fitnessSummary } from "@/src/lib/analytics/fitness";
import { daysBetween, startOfDay } from "@/src/lib/analytics/load";
import { formatMinutes, formatPace } from "@/src/lib/analytics/physiology";
import { comparePlanToRuns, type AdherenceStatus } from "@/src/lib/coach/adherence";
import { recommendForDay } from "@/src/lib/coach/recommend";
import { activitySport, isRunning, runningOnly, SPORT_LABELS } from "@/src/lib/sport";
import type { RunSummary } from "@/src/lib/types";
import { colors, fonts } from "@/src/theme";

type MonthGroup = {
  key: string;
  label: string;
  runs: RunSummary[];
  distanceKm: number;
};

type ListRow =
  | { kind: "month"; group: MonthGroup; expanded: boolean }
  | { kind: "run"; run: RunSummary; indexInMonth: number };

function tone(status: AdherenceStatus): "good" | "warn" | "bad" | "neutral" {
  if (status === "matched" || status === "rest_ok") return "good";
  if (status === "partial") return "warn";
  if (status === "skipped" || status === "too_hard") return "bad";
  return "neutral";
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function groupByMonth(runs: RunSummary[]): MonthGroup[] {
  const sorted = [...runs].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
  const order: string[] = [];
  const map = new Map<string, RunSummary[]>();
  for (const run of sorted) {
    const key = monthKey(run.startTime);
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(run);
  }
  return order.map((key) => {
    const monthRuns = map.get(key)!;
    return {
      key,
      label: monthLabel(key),
      runs: monthRuns,
      distanceKm: monthRuns.reduce((s, r) => s + r.distanceM, 0) / 1000,
    };
  });
}

export default function RunsScreen() {
  const { runs, profile, vo2, races, feedback } = useAuth();
  const months = useMemo(() => groupByMonth(runs), [runs]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([currentMonthKey()]));
  const [openedInitial, setOpenedInitial] = useState(false);

  useEffect(() => {
    if (openedInitial || !months.length) return;
    const preferred =
      months.find((m) => m.key === currentMonthKey())?.key ?? months[0].key;
    setExpanded(new Set([preferred]));
    setOpenedInitial(true);
  }, [months, openedInitial]);

  const fitness = useMemo(
    () => fitnessSummary(runningOnly(runs), profile, vo2, new Date()),
    [runs, profile, vo2],
  );

  /** Tylko dla rozwiniętych miesięcy — bez adaptacji (×7 rekurencji), żeby lista nie blokowała UI. */
  const adherenceByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof comparePlanToRuns>>();
    const runOnly = runningOnly(runs);
    for (const group of months) {
      if (!expanded.has(group.key)) continue;
      for (const run of group.runs) {
        if (!isRunning(run)) continue;
        const day = startOfDay(run.startTime);
        const key = day.toDateString();
        if (map.has(key)) continue;
        const planned = recommendForDay(runOnly, profile, fitness, day, races, feedback, {
          adapt: false,
        });
        map.set(key, comparePlanToRuns(planned.workout, runOnly, day, profile));
      }
    }
    return map;
  }, [months, expanded, runs, profile, fitness, races, feedback]);

  const rows = useMemo<ListRow[]>(() => {
    const out: ListRow[] = [];
    for (const group of months) {
      const isOpen = expanded.has(group.key);
      out.push({ kind: "month", group, expanded: isOpen });
      if (isOpen) {
        group.runs.forEach((run, indexInMonth) => {
          out.push({ kind: "run", run, indexInMonth });
        });
      }
    }
    return out;
  }, [months, expanded]);

  const toggleMonth = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <Screen testID="runs-screen">
      <Title>Aktywności</Title>
      <Muted>
        {runs.length
          ? `${runs.length} zapisanych — bieżący miesiąc otwarty, starsze zwinięte`
          : "Brak aktywności — zsynchronizuj Garmina w Ustawieniach."}
      </Muted>
      <FlatList
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(item) =>
          item.kind === "month" ? `m-${item.group.key}` : `r-${item.run.id}`
        }
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ gap: 10, paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.kind === "month") {
            const { group, expanded: open } = item;
            return (
              <Pressable
                testID={`runs-month-${group.key}`}
                onPress={() => toggleMonth(group.key)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={`${group.label}, ${group.runs.length} aktywności`}
              >
                {({ pressed }) => (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      backgroundColor: colors.bgElevated,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          fontFamily: fonts.bodyBold,
                          color: colors.text,
                          fontSize: 16,
                        }}
                      >
                        {group.label}
                      </Text>
                      <Muted>
                        {`${group.runs.length} · ${group.distanceKm.toFixed(1)} km`}
                      </Muted>
                    </View>
                    <Text
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.bodyMed,
                        fontSize: 13,
                      }}
                    >
                      {open ? "Zwiń" : "Rozwiń"}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }

          const { run, indexInMonth } = item;
          const pace = run.avgSpeed > 0 ? 1000 / run.avgSpeed : undefined;
          const sport = activitySport(run);
          const dayKey = startOfDay(run.startTime).toDateString();
          const adh = sport === "running" ? adherenceByDay.get(dayKey) : undefined;
          const isToday = daysBetween(new Date(run.startTime), new Date()) === 0;
          return (
            <Link href={`/run/${encodeURIComponent(run.id)}`} asChild>
              <Pressable>
                {({ pressed }) => (
                  <Card animated={false} style={{ opacity: pressed ? 0.85 : 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <Text
                        style={{
                          fontFamily: fonts.bodyBold,
                          color: colors.text,
                          fontSize: 16,
                          flex: 1,
                        }}
                      >
                        {run.name ?? SPORT_LABELS[sport]}
                      </Text>
                      <Text style={{ color: colors.primary, fontFamily: fonts.bodyMed, fontSize: 13 }}>
                        Szczegóły
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      <Badge>{SPORT_LABELS[sport]}</Badge>
                      {adh ? <Badge tone={tone(adh.status)}>{adh.label}</Badge> : null}
                      {isToday ? <Badge tone="good">Dziś</Badge> : null}
                      {feedback[run.id]?.rpe ? (
                        <Badge tone="neutral">{`RPE ${feedback[run.id]!.rpe}`}</Badge>
                      ) : null}
                    </View>
                    <Muted>
                      {new Date(run.startTime).toLocaleString("pl-PL", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Muted>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
                      <Muted>{`${(run.distanceM / 1000).toFixed(2)} km`}</Muted>
                      <Muted>{formatMinutes(run.durationS)}</Muted>
                      {pace !== undefined && <Muted>{`${formatPace(pace)}/km`}</Muted>}
                      {run.avgHr ? <Muted>{`${Math.round(run.avgHr)} ud./min`}</Muted> : null}
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
