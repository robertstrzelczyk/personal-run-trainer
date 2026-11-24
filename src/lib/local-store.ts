import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile, RaceEvent, RunFeedback, RunSummary } from "./types";

const KEYS = {
  profile: "app.profile",
  runs: "app.runs",
  vo2: "app.vo2",
  lastSync: "app.lastSync",
  autoSync: "app.autoSync",
  races: "app.races",
  feedback: "app.runFeedback",
  onboardingDone: "app.onboardingDone",
} as const;

export const BACKUP_VERSION = 1;

export interface LocalBackup {
  version: number;
  exportedAt: string;
  profile: Profile;
  runs: RunSummary[];
  vo2: Array<{ date: string; value: number }>;
  races: RaceEvent[];
  feedback: Record<string, RunFeedback>;
  lastSync: string | null;
  autoSync: boolean;
}

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
  races: RaceEvent[];
  feedback: Record<string, RunFeedback>;
  onboardingDone: boolean;
}> {
  const [profile, runs, vo2, lastSync, autoSyncRaw, races, feedback, onboardingRaw] =
    await Promise.all([
      readJson<Profile>(KEYS.profile),
      readJson<RunSummary[]>(KEYS.runs),
      readJson<Array<{ date: string; value: number }>>(KEYS.vo2),
      AsyncStorage.getItem(KEYS.lastSync),
      AsyncStorage.getItem(KEYS.autoSync),
      readJson<RaceEvent[]>(KEYS.races),
      readJson<Record<string, RunFeedback>>(KEYS.feedback),
      AsyncStorage.getItem(KEYS.onboardingDone),
    ]);
  return {
    profile,
    runs: runs ?? [],
    vo2: vo2 ?? [],
    lastSync,
    autoSync: autoSyncRaw !== "0",
    races: races ?? [],
    feedback: feedback ?? {},
    onboardingDone: onboardingRaw === "1",
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

export async function saveLocalRaces(races: RaceEvent[]) {
  await AsyncStorage.setItem(KEYS.races, JSON.stringify(races));
}

export async function saveLocalFeedback(feedback: Record<string, RunFeedback>) {
  await AsyncStorage.setItem(KEYS.feedback, JSON.stringify(feedback));
}

export async function saveOnboardingDone(done: boolean) {
  await AsyncStorage.setItem(KEYS.onboardingDone, done ? "1" : "0");
}

export async function buildLocalBackup(): Promise<LocalBackup> {
  const state = await loadLocalState();
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile: state.profile ?? {
      age: 35,
      sex: "male",
      maxHr: 185,
      restHr: 55,
      goal: "fitness",
      daysPerWeek: 4,
    },
    runs: state.runs,
    vo2: state.vo2,
    races: state.races,
    feedback: state.feedback,
    lastSync: state.lastSync,
    autoSync: state.autoSync,
  };
}

export async function applyLocalBackup(backup: LocalBackup): Promise<void> {
  if (!backup || typeof backup !== "object") throw new Error("Nieprawidłowy plik kopii.");
  if (!backup.profile || !Array.isArray(backup.runs)) {
    throw new Error("Brak profilu lub aktywności w kopii.");
  }
  await Promise.all([
    saveLocalProfile(backup.profile),
    saveLocalRuns(backup.runs),
    saveLocalVo2(backup.vo2 ?? []),
    saveLocalRaces(backup.races ?? []),
    saveLocalFeedback(backup.feedback ?? {}),
    saveLocalAutoSync(backup.autoSync !== false),
    backup.lastSync ? saveLocalLastSync(backup.lastSync) : AsyncStorage.removeItem(KEYS.lastSync),
  ]);
}
