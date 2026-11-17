import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { Badge, Card, Muted, Screen, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { formatMinutes, formatPace } from "@/src/lib/analytics/physiology";
import { activitySport, SPORT_LABELS } from "@/src/lib/sport";
import { colors, fonts } from "@/src/theme";

export default function RunsScreen() {
  const { runs } = useAuth();

  return (
    <Screen>
      <Title>Aktywności</Title>
      <Muted>
        {runs.length
          ? `${runs.length} zapisanych — kliknij, aby zobaczyć szczegóły (tętno, strefy)`
          : "Brak aktywności — zsynchronizuj Garmina w Ustawieniach."}
      </Muted>
      <FlatList
        data={runs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const pace = item.avgSpeed > 0 ? 1000 / item.avgSpeed : undefined;
          const sport = activitySport(item);
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
                    <Badge>{SPORT_LABELS[sport]}</Badge>
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
