import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SimpleBarChart } from "@/src/components/charts";
import { Card, Muted, Screen, Subtitle, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import {
  allPeriodStats,
  chartDaysForPeriod,
  dailyDistanceSeries,
  formatKm,
  sportFilterLabel,
  totalForSportFilter,
  type SportFilter,
  type StatsPeriod,
} from "@/src/lib/analytics/sport-stats";
import { SPORT_LABELS } from "@/src/lib/sport";
import type { ActivitySport } from "@/src/lib/types";
import { colors, fonts } from "@/src/theme";

const PERIODS: Array<{ id: StatsPeriod; label: string }> = [
  { id: "week", label: "Tydzień" },
  { id: "month", label: "Miesiąc" },
  { id: "year", label: "Rok" },
  { id: "all", label: "Cały zakres" },
];

const SPORT_FILTERS: Array<{ id: SportFilter; label: string }> = [
  { id: "all", label: "Wszystkie" },
  { id: "running", label: SPORT_LABELS.running },
  { id: "walking", label: SPORT_LABELS.walking },
  { id: "cycling", label: SPORT_LABELS.cycling },
];

const SPORT_COLORS: Record<ActivitySport, string> = {
  running: colors.primary,
  walking: colors.accent,
  cycling: "#5b8def",
};

export default function StatsScreen() {
  const { runs } = useAuth();
  const [period, setPeriod] = useState<StatsPeriod>("week");
  const [sportFilter, setSportFilter] = useState<SportFilter>("all");
  const stats = useMemo(() => allPeriodStats(runs), [runs]);
  const current = stats.find((s) => s.period === period)!;
  const summary = totalForSportFilter(current, sportFilter);
  const maxDist = Math.max(...current.sports.map((s) => s.distanceM), 1);
  const heroColor =
    sportFilter === "all" ? colors.primary : SPORT_COLORS[sportFilter];

  const chartDays = chartDaysForPeriod(period, current.from, current.to);
  const daily = useMemo(
    () => dailyDistanceSeries(runs, chartDays, new Date(), sportFilter),
    [runs, chartDays, sportFilter],
  );

  const distanceBars = useMemo(
    () =>
      daily.map((d) => ({
        value: Math.round(d.distanceKm * 100) / 100,
        label: d.date.slice(8),
        frontColor: heroColor,
      })),
    [daily, heroColor],
  );

  const sportBars = useMemo(
    () =>
      current.sports.map((s) => ({
        value: Math.round((s.distanceM / 1000) * 100) / 100,
        label: s.label.slice(0, 5),
        frontColor: SPORT_COLORS[s.sport],
      })),
    [current.sports],
  );

  return (
    <Screen testID="stats-screen">
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card accent>
          <Title>Statystyki</Title>
          <Muted>
            Dystans biegania, chodzenia i kolarstwa. Wybierz sport, żeby podsumowanie tygodnia /
            miesiąca / roku pokazywało tylko tę aktywność.
          </Muted>
        </Card>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {PERIODS.map((p) => {
            const active = p.id === period;
            return (
              <Pressable
                key={p.id}
                testID={`stats-period-${p.id}`}
                accessibilityLabel={p.label}
                onPress={() => setPeriod(p.id)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: active ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyBold,
                    color: active ? colors.primaryText : colors.muted,
                    fontSize: 13,
                  }}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SPORT_FILTERS.map((f) => {
            const active = f.id === sportFilter;
            return (
              <Pressable
                key={f.id}
                testID={`stats-sport-${f.id}`}
                accessibilityLabel={f.label}
                onPress={() => setSportFilter(f.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyBold,
                    color: active ? colors.primaryText : colors.muted,
                    fontSize: 12,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <Subtitle>{current.label}</Subtitle>
          <Muted>
            {`${current.from.toLocaleDateString("pl-PL")} – ${current.to.toLocaleDateString("pl-PL")}`}
          </Muted>
          <Text style={{ fontFamily: fonts.display, fontSize: 36, color: heroColor, marginTop: 4 }}>
            {formatKm(summary.distanceM)}
          </Text>
          <Muted>{sportFilterLabel(sportFilter)}</Muted>
          {summary.count > 0 ? (
            <Muted>{`${summary.count} aktywności`}</Muted>
          ) : (
            <Muted>Brak aktywności w tym filtrze.</Muted>
          )}
        </Card>

        <Card delay={40}>
          <Subtitle>Dystans w czasie</Subtitle>
          <Muted>
            {`${
              period === "all"
                ? `Ostatnie ${chartDays} dni z zakresu (wykres)`
                : period === "year"
                  ? "Ostatnie 90 dni (dziennie)"
                  : period === "month"
                    ? "Ostatnie 30 dni"
                    : "Ostatnie 7 dni"
            }${sportFilter !== "all" ? ` · ${SPORT_LABELS[sportFilter]}` : ""}`}
          </Muted>
          <SimpleBarChart
            data={distanceBars}
            formatY={(v) => `${v}`}
            emptyLabel="Brak aktywności w tym okresie."
          />
        </Card>

        <Card delay={60}>
          <Subtitle>Podział sportów</Subtitle>
          <SimpleBarChart data={sportBars} emptyLabel="Brak danych sportowych." />
        </Card>

        {current.sports.map((sport, i) => {
          const dimmed = sportFilter !== "all" && sportFilter !== sport.sport;
          return (
            <Card
              key={sport.sport}
              delay={80 + i * 40}
              style={dimmed ? { opacity: 0.45 } : undefined}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Subtitle>{sport.label}</Subtitle>
                <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.text }}>
                  {formatKm(sport.distanceM)}
                </Text>
              </View>
              <Muted>{`${sport.count} aktywności`}</Muted>
              <View
                style={{
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: colors.bgElevated,
                  overflow: "hidden",
                  marginTop: 8,
                }}
              >
                <View
                  style={{
                    width: `${Math.max(sport.distanceM > 0 ? 4 : 0, (sport.distanceM / maxDist) * 100)}%`,
                    height: "100%",
                    backgroundColor: SPORT_COLORS[sport.sport],
                    borderRadius: 999,
                  }}
                />
              </View>
            </Card>
          );
        })}

        <Card delay={200}>
          <Subtitle>Porównanie okresów</Subtitle>
          <Muted>{sportFilterLabel(sportFilter)}</Muted>
          {stats.map((s) => {
            const tot = totalForSportFilter(s, sportFilter);
            return (
              <View
                key={s.period}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontFamily: fonts.bodyMed }}>{s.label}</Text>
                <Text style={{ color: heroColor, fontFamily: fonts.bodyBold }}>
                  {formatKm(tot.distanceM)}
                </Text>
              </View>
            );
          })}
          {sportFilter === "all" && (
            <View style={{ marginTop: 8, gap: 4 }}>
              {stats.map((s) => (
                <Muted key={`${s.period}-break`}>
                  {`${s.label}: bieg ${formatKm(s.sports[0].distanceM)} · chód ${formatKm(s.sports[1].distanceM)} · rower ${formatKm(s.sports[2].distanceM)}`}
                </Muted>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
