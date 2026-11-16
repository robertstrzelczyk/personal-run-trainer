import { Link } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { Button, Card, Field, Muted, Screen, Title } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { colors } from "@/src/theme";

export default function LoginScreen() {
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!configured) {
      Alert.alert(
        "Brak konfiguracji",
        "Ustaw EXPO_PUBLIC_SUPABASE_URL i EXPO_PUBLIC_SUPABASE_ANON_KEY w pliku .env, potem zrestartuj Expo.",
      );
      return;
    }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert("Logowanie nieudane", e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Card>
          <Title>Zaloguj się</Title>
          <Muted>
            Konto chroni Twoje dane treningowe w bazie. Garmin Connect łączysz osobno przez Personal API
            Key w ustawieniach.
          </Muted>
          {!configured && (
            <Muted>Supabase nie jest skonfigurowany — uzupełnij zmienne środowiskowe.</Muted>
          )}
          <Field
            label="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Hasło"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title={busy ? "Logowanie…" : "Zaloguj"} onPress={onSubmit} disabled={busy} />
          <Link href="/(auth)/register" style={{ color: colors.primary, fontWeight: "600" }}>
            Nie masz konta? Zarejestruj się
          </Link>
        </Card>
      </ScrollView>
    </Screen>
  );
}
