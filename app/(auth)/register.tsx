import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/src/components/ui";

/** Rejestracja wyłączona — dane lokalne na urządzeniu. */
export default function RegisterScreen() {
  const router = useRouter();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Card>
          <Title>Rejestracja niedostępna</Title>
          <Muted>
            Konta w chmurze są wyłączone. Korzystaj z aplikacji lokalnie — backup JSON w Ustawieniach.
          </Muted>
          <Button title="Wróć" onPress={() => router.replace("/")} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
