import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SimpleBarChart } from "@/src/components/charts";
import { Card, Muted, Screen, Subtitle, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import {
  allPeriodStats,
  dailyDistanceSeries,
  formatKm,
  type StatsPeriod,
} from "@/src/lib/analytics/sport-stats";
import { colors, fonts } from "@/src/theme";

const PERIODS: Array<{ id: StatsPeriod; label: string }> = [
  { id: "week", label: "Tydzień" },
  { id: "month", label: "Miesiąc" },
  { id: "year", label: "Rok" },
];

const PERIOD_DAYS: Record<StatsPeriod, number> = {
  week: 7,
  month: 30,
  year: 90,
};

const SPORT_COLORS = {
  running: colors.primary,
  walking: colors.accent,
  cycling: "#5b8def",
} as const;

export default function StatsScreen() {
  const { runs } = useAuth();
  const [period, setPeriod] = useState<StatsPeriod>("week");
  const stats = useMemo(() => allPeriodStats(runs), [runs]);
  const current = stats.find((s) => s.period === period)!;
  const maxDist = Math.max(...current.sports.map((s) => s.distanceM), 1);

  const daily = useMemo(
    () => dailyDistanceSeries(runs, PERIOD_DAYS[period]),
    [runs, period],
  );

  const distanceBars = useMemo(
    () =>
      daily.map((d) => ({
        value: Math.round(d.distanceKm * 100) / 100,
        label: d.date.slice(8),
        frontColor: colors.primary,
      })),
    [daily],
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
            Dystans biegania, chodzenia i kolarstwa. Po synchronizacji Garmin zobaczysz tu też spacery i
            rower.
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

        <Card>
          <Subtitle>{current.label}</Subtitle>
          <Muted>
            {`${current.from.toLocaleDateString("pl-PL")} – ${current.to.toLocaleDateString("pl-PL")}`}
          </Muted>
          <Text style={{ fontFamily: fonts.display, fontSize: 36, color: colors.primary, marginTop: 4 }}>
            {formatKm(current.totalDistanceM)}
          </Text>
          <Muted>łącznie we wszystkich sportach</Muted>
        </Card>

        <Card delay={40}>
          <Subtitle>Dystans w czasie</Subtitle>
          <Muted>
            {period === "year"
              ? "Ostatnie 90 dni (dziennie)"
              : period === "month"
                ? "Ostatnie 30 dni"
                : "Ostatnie 7 dni"}
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

        {current.sports.map((sport, i) => (
          <Card key={sport.sport} delay={80 + i * 40}>
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
        ))}

        <Card delay={200}>
          <Subtitle>Porównanie okresów</Subtitle>
          {stats.map((s) => (
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
              <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>
                {formatKm(s.totalDistanceM)}
              </Text>
            </View>
          ))}
          <View style={{ marginTop: 8, gap: 4 }}>
            {stats.map((s) => (
              <Muted key={`${s.period}-break`}>
                {`${s.label}: bieg ${formatKm(s.sports[0].distanceM)} · chód ${formatKm(s.sports[1].distanceM)} · rower ${formatKm(s.sports[2].distanceM)}`}
              </Muted>
            ))}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
