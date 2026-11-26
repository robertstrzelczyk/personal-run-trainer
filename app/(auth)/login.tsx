import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/src/components/ui";

/** Logowanie wyłączone — dane lokalne na urządzeniu. */
export default function LoginScreen() {
  const router = useRouter();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Card>
          <Title>Konto niedostępne</Title>
          <Muted>
            Logowanie jest wyłączone. Profil, biegi i klucz Garmin zapisują się lokalnie na tym
            telefonie (AsyncStorage / SecureStore).
          </Muted>
          <Button title="Wróć" onPress={() => router.replace("/")} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
