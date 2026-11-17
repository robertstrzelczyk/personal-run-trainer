import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, Muted, Screen, Subtitle, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import {
  allPeriodStats,
  formatKm,
  type StatsPeriod,
} from "@/src/lib/analytics/sport-stats";
import { colors, fonts } from "@/src/theme";

const PERIODS: Array<{ id: StatsPeriod; label: string }> = [
  { id: "week", label: "Tydzień" },
  { id: "month", label: "Miesiąc" },
  { id: "year", label: "Rok" },
];

export default function StatsScreen() {
  const { runs } = useAuth();
  const [period, setPeriod] = useState<StatsPeriod>("week");
  const stats = useMemo(() => allPeriodStats(runs), [runs]);
  const current = stats.find((s) => s.period === period)!;
  const maxDist = Math.max(...current.sports.map((s) => s.distanceM), 1);

  return (
    <Screen>
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

        {current.sports.map((sport, i) => (
          <Card key={sport.sport} delay={60 + i * 40}>
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
                  backgroundColor:
                    sport.sport === "running"
                      ? colors.primary
                      : sport.sport === "walking"
                        ? colors.accent
                        : "#5b8def",
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
