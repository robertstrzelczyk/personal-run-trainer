import { useEffect, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import {
  Button,
  Card,
  ChipSelect,
  Field,
  Muted,
  Screen,
  Subtitle,
  Title,
  ToggleRow,
} from "@/src/components/ui";
import { clearGarminApiKey, getGarminApiKey, setGarminApiKey } from "@/src/lib/garmin-key";
import { AUTO_SYNC_HOURS } from "@/src/lib/garmin/apply-sync";
import type { SyncProgress } from "@/src/lib/garmin/client";
import { useAuth } from "@/src/lib/auth-context";
import { GOAL_OPTIONS, SEX_OPTIONS } from "@/src/lib/labels";
import type { Goal, Profile, Sex } from "@/src/lib/types";
import { colors, fonts } from "@/src/theme";

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
  const [profile, setProfile] = useState<Profile>(auth.profile);
  const busy = auth.syncing;
  const progress = auth.syncProgress;

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
    Alert.alert("Zapisano", "Klucz jest w bezpiecznym magazynie telefonu.");
  }

  async function onSync() {
    const key = (await getGarminApiKey()) ?? apiKey.trim();
    if (!key) {
      Alert.alert("Brak klucza", "Najpierw zapisz Personal API Key.");
      return;
    }
    try {
      if (apiKey.trim()) await setGarminApiKey(apiKey);
      const result = await auth.runSync({
        apiKey: key,
        days: Number(days) || 90,
      });
      if (!result) return;
      setHasKey(true);
      setApiKey("");
      setProfile(auth.profile);
      Alert.alert(
        "Synchronizacja zakończona",
        `Nowe biegi: ${result.runs.length}. Już znane: ${result.alreadyKnown}. Błędy: ${result.failed}. Dane zapisane lokalnie na telefonie.`,
      );
      result.warnings.forEach((w) => Alert.alert("Uwaga", w));
    } catch (e) {
      Alert.alert("Synchronizacja nieudana", e instanceof Error ? e.message : "Błąd");
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
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Card>
          <Title>Dane lokalne</Title>
          <Muted>
            Logowanie jest na razie wyłączone. Profil i biegi zapisują się tylko na tym telefonie.
          </Muted>
          {auth.lastSync && (
            <Muted>{`Ostatnia sync: ${new Date(auth.lastSync).toLocaleString("pl-PL")}`}</Muted>
          )}
          <Muted>{`Biegów zapisanych: ${auth.runs.length}`}</Muted>
          {auth.syncError ? <Muted>{`Ostatni błąd sync: ${auth.syncError}`}</Muted> : null}
          <ToggleRow
            label="Auto-sync przy otwarciu"
            detail={`Gdy minie ${AUTO_SYNC_HOURS} h od ostatniej synchronizacji.`}
            value={auth.autoSync}
            onValueChange={(v) => void auth.setAutoSync(v)}
          />
        </Card>

        <Card delay={60}>
          <Subtitle>Garmin Connect</Subtitle>
          <Muted>
            W Garmin Connect (wersja na komputer): Ustawienia → Personal API Key → Utwórz klucz. Klucz
            zostaje na telefonie; nie logujemy hasłem do Connect.
          </Muted>
          <Muted>{hasKey ? "Klucz jest zapisany na urządzeniu." : "Brak zapisanego klucza."}</Muted>
          <Field
            label="Klucz Personal API"
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
            title={busy && progress ? PHASE[progress.phase] : "Synchronizuj z Garmin"}
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

        <Card delay={120}>
          <Subtitle>Profil treningowy</Subtitle>
          <Field
            label="Wiek"
            keyboardType="number-pad"
            value={String(profile.age)}
            onChangeText={(t) => setProfile({ ...profile, age: Number(t) || profile.age })}
          />
          <ChipSelect
            label="Płeć"
            value={profile.sex}
            options={SEX_OPTIONS}
            onChange={(sex: Sex) => setProfile({ ...profile, sex })}
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
          <ChipSelect
            label="Cel"
            value={profile.goal}
            options={GOAL_OPTIONS}
            onChange={(goal: Goal) => setProfile({ ...profile, goal })}
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

        <Card delay={180}>
          <Subtitle>O aplikacji</Subtitle>
          <Text style={{ color: colors.muted, lineHeight: 20, fontFamily: fonts.body }}>
            Osobisty trener dla Garmin Venu 2 Plus: forma, obciążenie, VO2/VDOT oraz trening na dziś i
            jutro. Dane lokalne na telefonie; klucz Garmin w bezpiecznym magazynie.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
