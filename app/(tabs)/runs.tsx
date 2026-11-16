import { FlatList, Text, View } from "react-native";
import { Card, Muted, Screen, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { formatMinutes, formatPace } from "@/src/lib/analytics/physiology";
import { colors } from "@/src/theme";

export default function RunsScreen() {
  const { runs } = useAuth();

  return (
    <Screen>
      <Title>Twoje biegi</Title>
      <Muted>{runs.length ? `${runs.length} aktywności w bazie` : "Brak biegów — zsynchronizuj Garmina."}</Muted>
      <FlatList
        data={runs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 40, paddingTop: 8 }}
        renderItem={({ item }) => {
          const pace = item.avgSpeed > 0 ? 1000 / item.avgSpeed : undefined;
          return (
            <Card>
              <Text style={{ fontWeight: "700", color: colors.text }}>
                {item.name ?? "Bieg"}
              </Text>
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
                {item.avgHr ? <Muted>{`${Math.round(item.avgHr)} bpm`}</Muted> : null}
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
