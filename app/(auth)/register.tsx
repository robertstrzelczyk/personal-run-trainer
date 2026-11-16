import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { Button, Card, Field, Muted, Screen, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { colors } from "@/src/theme";

export default function RegisterScreen() {
  const { signUp, configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!configured) {
      Alert.alert("Brak konfiguracji", "Ustaw zmienne Supabase w .env.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Hasło", "Hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    setBusy(true);
    try {
      await signUp(email.trim(), password);
      Alert.alert("Konto utworzone", "Jeśli Supabase wymaga potwierdzenia e-maila, sprawdź skrzynkę.");
      router.replace("/(auth)/login");
    } catch (e) {
      Alert.alert("Rejestracja nieudana", e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Card>
          <Title>Rejestracja</Title>
          <Muted>Załóż konto aplikacji (nie jest to logowanie do Garmin Connect).</Muted>
          <Field
            label="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field label="Hasło" secureTextEntry value={password} onChangeText={setPassword} />
          <Button title={busy ? "Tworzenie…" : "Utwórz konto"} onPress={onSubmit} disabled={busy} />
          <Link href="/(auth)/login" style={{ color: colors.primary, fontWeight: "600" }}>
            Mam już konto
          </Link>
        </Card>
      </ScrollView>
    </Screen>
  );
}
