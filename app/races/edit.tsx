import * as Crypto from "expo-crypto";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";
import {
  Button,
  Card,
  ChipSelect,
  Field,
  Muted,
  Screen,
  Title,
  ToggleRow,
} from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth-context";
import { RACE_DISTANCE_OPTIONS } from "@/src/lib/labels";
import type { RaceDistance, RaceEvent } from "@/src/lib/types";
import { colors } from "@/src/theme";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseTargetTime(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const parts = t.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return undefined;
}

function formatTargetTime(s?: number): string {
  if (s === undefined) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function EditRaceScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { races, saveRaces } = useAuth();
  const router = useRouter();
  const existing = useMemo(() => races.find((r) => r.id === id), [races, id]);

  const [name, setName] = useState(existing?.name ?? "");
  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [distance, setDistance] = useState<RaceDistance>(existing?.distance ?? "half");
  const [target, setTarget] = useState(formatTargetTime(existing?.targetTimeS));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [prepareForIt, setPrepareForIt] = useState(existing?.prepareForIt ?? !races.some((r) => r.prepareForIt));

  async function onSave() {
    if (!name.trim()) {
      Alert.alert("Nazwa", "Podaj nazwę startu.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert("Data", "Użyj formatu RRRR-MM-DD, np. 2026-05-17.");
      return;
    }
    const targetTimeS = parseTargetTime(target);
    if (target.trim() && targetTimeS === undefined) {
      Alert.alert("Cel czasowy", "Format: MM:SS lub H:MM:SS.");
      return;
    }

    const event: RaceEvent = {
      id: existing?.id ?? Crypto.randomUUID(),
      name: name.trim(),
      date: date.trim(),
      distance,
      targetTimeS,
      notes: notes.trim() || undefined,
      prepareForIt,
    };

    let next: RaceEvent[];
    if (existing) {
      next = races.map((r) => (r.id === existing.id ? event : r));
    } else {
      next = [...races, event];
    }
    if (event.prepareForIt) {
      next = next.map((r) => ({ ...r, prepareForIt: r.id === event.id }));
    }
    await saveRaces(next);
    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: existing ? "Edytuj start" : "Nowy start",
          headerStyle: { backgroundColor: colors.bgElevated },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Screen testID="race-edit-screen">
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <Card accent>
            <Title>{existing ? "Edytuj start" : "Nowy start"}</Title>
            <Muted>Data w formacie RRRR-MM-DD. Cel czasowy opcjonalny (np. 1:45:00).</Muted>
            <Field testID="race-name" label="Nazwa" value={name} onChangeText={setName} placeholder="Półmaraton Warszawy" />
            <Field
              testID="race-date"
              label="Data startu"
              value={date}
              onChangeText={setDate}
              placeholder="2026-05-17"
              autoCapitalize="none"
            />
            <ChipSelect
              testID="race-distance"
              label="Dystans"
              value={distance}
              options={RACE_DISTANCE_OPTIONS}
              onChange={setDistance}
            />
            <Field
              testID="race-target"
              label="Cel czasowy (opcjonalnie)"
              value={target}
              onChangeText={setTarget}
              placeholder="1:45:00"
              autoCapitalize="none"
            />
            <Field
              testID="race-notes"
              label="Notatki"
              value={notes}
              onChangeText={setNotes}
              placeholder="np. cel: finisz z uśmiechem"
            />
            <ToggleRow
              testID="race-prepare"
              label="Przygotuj mnie pod ten bieg"
              detail="Trener dopasuje treningi do daty i dystansu startu."
              value={prepareForIt}
              onValueChange={setPrepareForIt}
            />
            <Button testID="race-save" title="Zapisz" onPress={() => void onSave()} />
          </Card>
        </ScrollView>
      </Screen>
    </>
  );
}
