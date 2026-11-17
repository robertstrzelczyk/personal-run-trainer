import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile, RunSummary } from "./types";

const KEYS = {
  profile: "app.profile",
  runs: "app.runs",
  vo2: "app.vo2",
  lastSync: "app.lastSync",
  autoSync: "app.autoSync",
} as const;

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadLocalState(): Promise<{
  profile: Profile | null;
  runs: RunSummary[];
  vo2: Array<{ date: string; value: number }>;
  lastSync: string | null;
  autoSync: boolean;
}> {
  const [profile, runs, vo2, lastSync, autoSyncRaw] = await Promise.all([
    readJson<Profile>(KEYS.profile),
    readJson<RunSummary[]>(KEYS.runs),
    readJson<Array<{ date: string; value: number }>>(KEYS.vo2),
    AsyncStorage.getItem(KEYS.lastSync),
    AsyncStorage.getItem(KEYS.autoSync),
  ]);
  return {
    profile,
    runs: runs ?? [],
    vo2: vo2 ?? [],
    lastSync,
    autoSync: autoSyncRaw !== "0",
  };
}

export async function saveLocalProfile(profile: Profile) {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export async function saveLocalRuns(runs: RunSummary[]) {
  await AsyncStorage.setItem(KEYS.runs, JSON.stringify(runs));
}

export async function saveLocalVo2(vo2: Array<{ date: string; value: number }>) {
  await AsyncStorage.setItem(KEYS.vo2, JSON.stringify(vo2));
}

export async function saveLocalLastSync(iso: string) {
  await AsyncStorage.setItem(KEYS.lastSync, iso);
}

export async function saveLocalAutoSync(enabled: boolean) {
  await AsyncStorage.setItem(KEYS.autoSync, enabled ? "1" : "0");
}
