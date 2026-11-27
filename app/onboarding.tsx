import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import {
  Button,
  Card,
  ChipSelect,
  Field,
  Muted,
  Screen,
  Subtitle,
  Title,
} from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { getGarminApiKey, setGarminApiKey } from "@/src/lib/garmin-key";
import { GOAL_OPTIONS, SEX_OPTIONS } from "@/src/lib/labels";
import type { Goal, Profile, Sex } from "@/src/lib/types";

const STEPS = ["Garmin", "Profil", "Sync"] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [profile, setProfile] = useState<Profile>(auth.profile);
  const [busy, setBusy] = useState(false);

  async function saveKeyAndNext() {
    if (apiKey.trim().length < 8) {
      Alert.alert("Klucz API", "Wklej Personal API Key z Garmin Connect (min. 8 znaków).");
      return;
    }
    await setGarminApiKey(apiKey.trim());
    setApiKey("");
    setStep(1);
  }

  async function saveProfileAndNext() {
    await auth.saveProfile(profile);
    setStep(2);
  }

  async function finish(withSync: boolean) {
    setBusy(true);
    try {
      if (withSync) {
        const key = await getGarminApiKey();
        if (key) {
          await auth.runSync({ apiKey: key, days: 90 });
        }
      }
      await auth.completeOnboarding();
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Sync", e instanceof Error ? e.message : "Nie udało się zsynchronizować.");
      await auth.completeOnboarding();
      router.replace("/(tabs)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen testID="onboarding-screen">
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 48 }}>
        <Card accent>
          <Title>Witaj w Trenerze biegowym</Title>
          <Muted>{`Krok ${step + 1}/3: ${STEPS[step]}`}</Muted>
        </Card>

        {step === 0 && (
          <Card>
            <Subtitle>Klucz Garmin Personal API</Subtitle>
            <Muted>
              Garmin Connect (www) → Ustawienia → Personal API Key. Klucz zostaje w SecureStore na
              telefonie.
            </Muted>
            <Field
              label="Personal API Key"
              testID="onboarding-api-key"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Button testID="onboarding-save-key" title="Zapisz i dalej" onPress={saveKeyAndNext} />
            <Button
              testID="onboarding-skip-key"
              title="Pomiń na razie"
              variant="ghost"
              onPress={() => setStep(1)}
            />
          </Card>
        )}

        {step === 1 && (
          <Card>
            <Subtitle>Profil treningowy</Subtitle>
            <Field
              label="Wiek"
              testID="onboarding-age"
              keyboardType="number-pad"
              value={String(profile.age)}
              onChangeText={(t) => setProfile({ ...profile, age: Number(t) || profile.age })}
            />
            <ChipSelect
              label="Płeć"
              testID="onboarding-sex"
              value={profile.sex}
              options={SEX_OPTIONS}
              onChange={(sex: Sex) => setProfile({ ...profile, sex })}
            />
            <Field
              label="HRmax"
              testID="onboarding-max-hr"
              keyboardType="number-pad"
              value={String(profile.maxHr)}
              onChangeText={(t) => setProfile({ ...profile, maxHr: Number(t) || profile.maxHr })}
            />
            <Field
              label="HR spoczynkowe"
              testID="onboarding-rest-hr"
              keyboardType="number-pad"
              value={String(profile.restHr)}
              onChangeText={(t) => setProfile({ ...profile, restHr: Number(t) || profile.restHr })}
            />
            <ChipSelect
              label="Cel"
              testID="onboarding-goal"
              value={profile.goal}
              options={GOAL_OPTIONS}
              onChange={(goal: Goal) => setProfile({ ...profile, goal })}
            />
            <Field
              label="Dni treningowe / tydzień"
              testID="onboarding-days-per-week"
              keyboardType="number-pad"
              value={String(profile.daysPerWeek)}
              onChangeText={(t) =>
                setProfile({ ...profile, daysPerWeek: Math.min(7, Math.max(2, Number(t) || 4)) })
              }
            />
            <Button
              testID="onboarding-save-profile"
              title="Zapisz i dalej"
              onPress={saveProfileAndNext}
            />
          </Card>
        )}

        {step === 2 && (
          <Card>
            <Subtitle>Pierwsza synchronizacja</Subtitle>
            <Muted>
              Pobierzemy biegi, spacery i rower z Garmin Connect (ok. 90 dni). Potem zobaczysz formę i
              trening na dziś.
            </Muted>
            <View style={{ gap: 8, marginTop: 4 }}>
              <Button
                testID="onboarding-sync-start"
                title={busy ? "Synchronizuję…" : "Synchronizuj i start"}
                onPress={() => finish(true)}
                disabled={busy}
              />
              <Button
                testID="onboarding-skip-sync"
                title="Pomiń sync — wejdź do aplikacji"
                variant="ghost"
                onPress={() => finish(false)}
                disabled={busy}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
