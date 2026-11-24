import { Link } from "expo-router";
import { Directory, File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
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
import { deloadUntilFromToday } from "@/src/lib/coach/deload";
import { GOAL_OPTIONS, SEX_OPTIONS } from "@/src/lib/labels";
import type { LocalBackup } from "@/src/lib/local-store";
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
  /** 0 = cała historia (~10 lat wstecz, chunkowane zapytania) */
  const [syncDays, setSyncDays] = useState(90);
  const [profile, setProfile] = useState<Profile>(auth.profile);

  const SYNC_PRESETS: Array<{ days: number; label: string; detail: string }> = [
    { days: 90, label: "90 dni", detail: "Szybki sync" },
    { days: 365, label: "1 rok", detail: "Pełny sezon" },
    { days: 0, label: "Cała historia", detail: "Od ~10 lat wstecz (dłużej)" },
  ];
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
        days: syncDays,
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

  async function onExportBackup() {
    try {
      const backup = await auth.exportBackup();
      const dir = new Directory(Paths.cache, "backups");
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
      const name = `trener-backup-${backup.exportedAt.slice(0, 10)}.json`;
      const file = new File(dir, name);
      if (file.exists) file.delete();
      file.create();
      await file.write(JSON.stringify(backup, null, 2));
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Backup", "Udostępnianie niedostępne na tym urządzeniu.");
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Eksport kopii zapasowej",
      });
    } catch (e) {
      Alert.alert("Backup", e instanceof Error ? e.message : "Eksport nieudany");
    }
  }

  async function onImportBackup() {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (pick.canceled || !pick.assets?.[0]) return;
      const asset = pick.assets[0];
      const file = new File(asset.uri);
      const text = await file.text();
      const parsed = JSON.parse(text) as LocalBackup;
      Alert.alert(
        "Przywrócić kopię?",
        `Nadpisze lokalne dane (${parsed.runs?.length ?? 0} aktywności).`,
        [
          { text: "Anuluj", style: "cancel" },
          {
            text: "Przywróć",
            style: "destructive",
            onPress: async () => {
              try {
                await auth.importBackup(parsed);
                setProfile(auth.profile);
                Alert.alert("OK", "Kopia przywrócona.");
              } catch (e) {
                Alert.alert("Błąd", e instanceof Error ? e.message : "Import nieudany");
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert("Import", e instanceof Error ? e.message : "Nie udało się wczytać pliku");
    }
  }

  async function enableDeload(daysN: number) {
    const until = deloadUntilFromToday(daysN);
    const next = { ...profile, deloadUntil: until };
    setProfile(next);
    await auth.saveProfile(next);
    Alert.alert("Deload", `Tryb deload do ${until}.`);
  }

  async function clearDeload() {
    const next = { ...profile, deloadUntil: undefined };
    setProfile(next);
    await auth.saveProfile(next);
    Alert.alert("Deload", "Tryb deload wyłączony.");
  }

  return (
    <Screen testID="settings-screen">
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
            testID="settings-auto-sync"
            label="Auto-sync przy otwarciu"
            detail={`Gdy minie ${AUTO_SYNC_HOURS} h od ostatniej synchronizacji.`}
            value={auth.autoSync}
            onValueChange={(v) => void auth.setAutoSync(v)}
          />
          <Button title="Eksportuj kopię JSON" variant="ghost" onPress={onExportBackup} />
          <Button title="Przywróć z JSON" variant="ghost" onPress={onImportBackup} />
        </Card>

        <Card delay={60}>
          <Subtitle>Garmin Connect</Subtitle>
          <Muted>
            W Garmin Connect (wersja na komputer): Ustawienia → Personal API Key → Utwórz klucz. Klucz
            zostaje na telefonie; nie logujemy hasłem do Connect.
          </Muted>
          <Muted>{hasKey ? "Klucz jest zapisany na urządzeniu." : "Brak zapisanego klucza."}</Muted>
          <Field
            testID="settings-api-key"
            label="Klucz Personal API"
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            secureTextEntry
            placeholder={hasKey ? "Wklej nowy klucz, aby wymienić" : "Wklej klucz"}
          />
          <Muted>Zakres historii do pobrania</Muted>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SYNC_PRESETS.map((p) => {
              const active = syncDays === p.days;
              return (
                <Pressable
                  key={p.label}
                  testID={`settings-sync-range-${p.days}`}
                  onPress={() => setSyncDays(p.days)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: active ? colors.primary : colors.card,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    minWidth: "30%",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyBold,
                      color: active ? colors.primaryText : colors.text,
                      fontSize: 13,
                    }}
                  >
                    {p.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      color: active ? colors.primaryText : colors.muted,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {p.detail}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Muted>
            Personal API nie ma „od pierwszego treningu na zegarku” — bierzemy okna 28 dni wstecz
            (przy całej historii ~10 lat). Duży sync może potrwać.
          </Muted>
          <Button
            testID="settings-save-key"
            title="Zapisz klucz"
            variant="ghost"
            onPress={saveKey}
            disabled={busy}
          />
          <Button
            testID="settings-sync"
            title={busy && progress ? PHASE[progress.phase] : "Synchronizuj z Garmin"}
            onPress={onSync}
            disabled={busy}
          />
          {busy && progress?.phase === "download" && progress.total ? (
            <Muted>{`${progress.done ?? 0} / ${progress.total}`}</Muted>
          ) : null}
          {hasKey && (
            <Button
              testID="settings-clear-key"
              title="Usuń klucz z telefonu"
              variant="danger"
              onPress={async () => {
                await clearGarminApiKey();
                setHasKey(false);
              }}
            />
          )}
        </Card>

        <Link href="/races" asChild>
          <Pressable>
            {({ pressed }) => (
              <Card delay={90} accent style={{ opacity: pressed ? 0.9 : 1 }}>
                <Subtitle>Kalendarz startów</Subtitle>
                <Muted>
                  Zapisz biegi, na które się zapisałeś. Włącz przygotowanie — trener dopasuje taper i
                  treningi pod datę startu.
                </Muted>
                <Muted>{`Zapisanych startów: ${auth.races.length}`}</Muted>
              </Card>
            )}
          </Pressable>
        </Link>

        <Link href="/plan" asChild>
          <Pressable>
            {({ pressed }) => (
              <Card delay={100} style={{ opacity: pressed ? 0.9 : 1 }}>
                <Subtitle>Plan do startu (blok)</Subtitle>
                <Muted>
                  Podgląd tygodni do aktywnego startu (fazy, km, typy treningów) — do 16 tygodni przy
                  maratonie.
                </Muted>
              </Card>
            )}
          </Pressable>
        </Link>

        <Card delay={110}>
          <Subtitle>Deload / regeneracja</Subtitle>
          <Muted>
            {profile.deloadUntil
              ? `Aktywny do ${profile.deloadUntil} — coach bez jakości.`
              : "Wyłączony. Włącz na kilka dni po kontuzji lub przeciążeniu."}
          </Muted>
          <Button title="Deload 3 dni" variant="ghost" onPress={() => enableDeload(3)} />
          <Button title="Deload 7 dni" variant="ghost" onPress={() => enableDeload(7)} />
          {profile.deloadUntil ? (
            <Button title="Wyłącz deload" variant="danger" onPress={clearDeload} />
          ) : null}
        </Card>

        <Card delay={120}>
          <Subtitle>Profil treningowy</Subtitle>
          <Field
            testID="settings-age"
            label="Wiek"
            keyboardType="number-pad"
            value={String(profile.age)}
            onChangeText={(t) => setProfile({ ...profile, age: Number(t) || profile.age })}
          />
          <ChipSelect
            testID="settings-sex"
            label="Płeć"
            value={profile.sex}
            options={SEX_OPTIONS}
            onChange={(sex: Sex) => setProfile({ ...profile, sex })}
          />
          <Field
            testID="settings-max-hr"
            label="Tętno maksymalne"
            keyboardType="number-pad"
            value={String(profile.maxHr)}
            onChangeText={(t) => setProfile({ ...profile, maxHr: Number(t) || profile.maxHr })}
          />
          <Field
            testID="settings-rest-hr"
            label="Tętno spoczynkowe"
            keyboardType="number-pad"
            value={String(profile.restHr)}
            onChangeText={(t) => setProfile({ ...profile, restHr: Number(t) || profile.restHr })}
          />
          <ChipSelect
            testID="settings-goal"
            label="Cel"
            value={profile.goal}
            options={GOAL_OPTIONS}
            onChange={(goal: Goal) => setProfile({ ...profile, goal })}
          />
          <Field
            testID="settings-days-per-week"
            label="Dni biegowe / tydzień"
            keyboardType="number-pad"
            value={String(profile.daysPerWeek)}
            onChangeText={(t) =>
              setProfile({ ...profile, daysPerWeek: Number(t) || profile.daysPerWeek })
            }
          />
          <Button testID="settings-save-profile" title="Zapisz profil" onPress={onSaveProfile} />
        </Card>

        <Card delay={180}>
          <Subtitle>O aplikacji</Subtitle>
          <Text style={{ color: colors.muted, lineHeight: 20, fontFamily: fonts.body }}>
            Osobisty trener dla Garmin Venu 2 Plus: forma, obciążenie, VO2/VDOT, plan 7 dni / blok do
            startu, eksport FIT oraz kopia JSON. Dane lokalne na telefonie.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
