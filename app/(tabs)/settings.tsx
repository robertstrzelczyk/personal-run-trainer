import { useEffect, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { Button, Card, Field, Muted, Screen, Subtitle, Title } from "@/src/components/ui";
import { clearGarminApiKey, getGarminApiKey, setGarminApiKey } from "@/src/lib/garmin-key";
import { syncGarmin, type SyncProgress } from "@/src/lib/garmin/client";
import { useAuth } from "@/src/lib/auth-context";
import type { Goal, Profile, Sex } from "@/src/lib/types";
import { colors } from "@/src/theme";

const PHASE: Record<SyncProgress["phase"], string> = {
  token: "Logowanie kluczem API…",
  list: "Pobieram listę biegów…",
  download: "Pobieram i analizuję biegi…",
  metrics: "Pobieram VO2max i strefy tętna…",
};

export default function SettingsScreen() {
  const auth = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [days, setDays] = useState("90");
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [profile, setProfile] = useState<Profile>(auth.profile);
  const busy = progress !== null;

  useEffect(() => {
    setProfile(auth.profile);
  }, [auth.profile]);

  useEffect(() => {
    (async () => {
      const key = await getGarminApiKey();
      setHasKey(Boolean(key));
    })();
  }, []);

  async function saveKey() {
    if (apiKey.trim().length < 8) {
      Alert.alert("Klucz API", "Wklej prawidłowy Personal API Key z Garmin Connect.");
      return;
    }
    await setGarminApiKey(apiKey);
    setApiKey("");
    setHasKey(true);
    Alert.alert("Zapisano", "Klucz jest w bezpiecznym magazynie telefonu (SecureStore).");
  }

  async function onSync() {
    const key = (await getGarminApiKey()) ?? apiKey.trim();
    if (!key) {
      Alert.alert("Brak klucza", "Najpierw zapisz Personal API Key.");
      return;
    }
    setProgress({ phase: "token" });
    try {
      if (apiKey.trim()) await setGarminApiKey(apiKey);
      const result = await syncGarmin({
        apiKey: key,
        days: Number(days) || 90,
        known: auth.runs.map((r) => ({ id: r.id, startTime: r.startTime })),
        onProgress: setProgress,
      });

      let nextProfile = { ...auth.profile };
      if (result.maxHr || result.restHr) {
        nextProfile = {
          ...nextProfile,
          maxHr: result.maxHr ?? nextProfile.maxHr,
          restHr: result.restHr ?? nextProfile.restHr,
        };
        await auth.saveProfile(nextProfile);
        setProfile(nextProfile);
      }

      const merged = [
        ...result.runs,
        ...auth.runs.filter((r) => !result.runs.some((n) => n.id === r.id)),
      ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      auth.setRunsLocal(merged);

      if (result.vo2.length) {
        const map = new Map(auth.vo2.map((v) => [v.date, v.value]));
        for (const v of result.vo2) map.set(v.date, v.value);
        auth.setVo2Local([...map.entries()].map(([date, value]) => ({ date, value })));
      }
      auth.setLastSyncLocal(new Date().toISOString());
      setHasKey(true);
      setApiKey("");

      Alert.alert(
        "Synchronizacja zakończona",
        `Nowe biegi: ${result.runs.length}. Już znane: ${result.alreadyKnown}. Błędy: ${result.failed}. Dane zapisane lokalnie na telefonie.`,
      );
      result.warnings.forEach((w) => Alert.alert("Uwaga", w));
    } catch (e) {
      Alert.alert("Synchronizacja nieudana", e instanceof Error ? e.message : "Błąd");
    } finally {
      setProgress(null);
    }
  }

  async function onSaveProfile() {
    try {
      await auth.saveProfile(profile);
      Alert.alert("Zapisano", "Profil treningowy zaktualizowany.");
    } catch (e) {
      Alert.alert("Błąd", e instanceof Error ? e.message : "Nie udało się zapisać");
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 48 }}>
        <Card>
          <Title>Dane lokalne</Title>
          <Muted>
            Logowanie jest na razie wyłączone. Profil i biegi zapisują się na tym telefonie
            (AsyncStorage).
          </Muted>
          {auth.lastSync && (
            <Muted>{`Ostatnia sync: ${new Date(auth.lastSync).toLocaleString("pl-PL")}`}</Muted>
          )}
          <Muted>{`Biegów w pamięci: ${auth.runs.length}`}</Muted>
        </Card>

        <Card>
          <Subtitle>Garmin Connect (Personal API Key)</Subtitle>
          <Muted>
            W Garmin Connect (wersja na komputer): Ustawienia → Personal API Key → Utwórz klucz. Klucz
            zostaje na telefonie; nie logujemy hasłem do Connect.
          </Muted>
          <Muted>{hasKey ? "Klucz jest zapisany na urządzeniu." : "Brak zapisanego klucza."}</Muted>
          <Field
            label="Personal API Key"
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            secureTextEntry
            placeholder={hasKey ? "Wklej nowy klucz, aby wymienić" : "Wklej klucz"}
          />
          <Field
            label="Zakres historii (dni)"
            value={days}
            onChangeText={setDays}
            keyboardType="number-pad"
          />
          <Button title="Zapisz klucz" variant="ghost" onPress={saveKey} disabled={busy} />
          <Button
            title={busy ? PHASE[progress!.phase] : "Synchronizuj z Garmin"}
            onPress={onSync}
            disabled={busy}
          />
          {busy && progress?.phase === "download" && progress.total ? (
            <Muted>{`${progress.done ?? 0} / ${progress.total}`}</Muted>
          ) : null}
          {hasKey && (
            <Button
              title="Usuń klucz z telefonu"
              variant="danger"
              onPress={async () => {
                await clearGarminApiKey();
                setHasKey(false);
              }}
            />
          )}
        </Card>

        <Card>
          <Subtitle>Profil treningowy</Subtitle>
          <Field
            label="Wiek"
            keyboardType="number-pad"
            value={String(profile.age)}
            onChangeText={(t) => setProfile({ ...profile, age: Number(t) || profile.age })}
          />
          <Field
            label="Płeć (male/female)"
            autoCapitalize="none"
            value={profile.sex}
            onChangeText={(t) =>
              setProfile({ ...profile, sex: (t === "female" ? "female" : "male") as Sex })
            }
          />
          <Field
            label="Tętno maksymalne"
            keyboardType="number-pad"
            value={String(profile.maxHr)}
            onChangeText={(t) => setProfile({ ...profile, maxHr: Number(t) || profile.maxHr })}
          />
          <Field
            label="Tętno spoczynkowe"
            keyboardType="number-pad"
            value={String(profile.restHr)}
            onChangeText={(t) => setProfile({ ...profile, restHr: Number(t) || profile.restHr })}
          />
          <Field
            label="Cel (fitness/5k/10k/half/marathon)"
            autoCapitalize="none"
            value={profile.goal}
            onChangeText={(t) => setProfile({ ...profile, goal: t as Goal })}
          />
          <Field
            label="Dni biegowe / tydzień"
            keyboardType="number-pad"
            value={String(profile.daysPerWeek)}
            onChangeText={(t) =>
              setProfile({ ...profile, daysPerWeek: Number(t) || profile.daysPerWeek })
            }
          />
          <Button title="Zapisz profil" onPress={onSaveProfile} />
        </Card>

        <Card>
          <Subtitle>O aplikacji</Subtitle>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            Osobisty trener dla Garmin Venu 2 Plus: forma, obciążenie, VO2/VDOT i trening na dziś.
            Dane lokalne na telefonie; klucz Garmin w SecureStore.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
