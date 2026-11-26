import { Stack, useRouter } from "expo-router";
import { Button, Muted, Screen, Title } from "@/src/components/ui";

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: "Nie znaleziono" }} />
      <Screen>
        <Title>Tej strony nie ma</Title>
        <Muted>Link jest nieaktualny albo ekran został usunięty.</Muted>
        <Button title="Wróć na dziś" onPress={() => router.replace("/")} />
      </Screen>
    </>
  );
}
