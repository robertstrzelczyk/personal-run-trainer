import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { Profile, RaceEvent, RunFeedback, RunSummary } from "./types";
import {
  applyLocalBackup,
  buildLocalBackup,
  clearLocalLastSync,
  loadIgnoredActivityIds,
  loadLocalState,
  saveIgnoredActivityIds,
  saveLocalAutoSync,
  saveLocalFeedback,
  saveLocalLastSync,
  saveLocalProfile,
  saveLocalRaces,
  saveLocalRuns,
  saveLocalVo2,
  saveOnboardingDone,
  type LocalBackup,
} from "./local-store";
import { getGarminApiKey } from "./garmin-key";
import {
  mergeSyncIntoState,
  runGarminSync,
  shouldAutoSync,
} from "./garmin/apply-sync";
import type { SyncProgress, SyncResult } from "./garmin/client";

const DEFAULT_PROFILE: Profile = {
  age: 35,
  sex: "male",
  maxHr: 185,
  restHr: 55,
  goal: "fitness",
  daysPerWeek: 4,
};

interface AppStateValue {
  ready: boolean;
  configured: boolean;
  session: null;
  user: null;
  profile: Profile;
  runs: RunSummary[];
  vo2: Array<{ date: string; value: number }>;
  races: RaceEvent[];
  feedback: Record<string, RunFeedback>;
  onboardingDone: boolean;
  lastSync: string | null;
  autoSync: boolean;
  syncing: boolean;
  syncProgress: SyncProgress | null;
  syncError: string | null;
  refreshData: () => Promise<void>;
  setProfileLocal: (p: Profile) => void;
  setRunsLocal: (runs: RunSummary[]) => void;
  setVo2Local: (vo2: Array<{ date: string; value: number }>) => void;
  setRacesLocal: (races: RaceEvent[]) => void;
  setLastSyncLocal: (iso: string | null) => void;
  setAutoSync: (enabled: boolean) => Promise<void>;
  saveRaces: (races: RaceEvent[]) => Promise<void>;
  setRunFeedback: (runId: string, next: RunFeedback) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  exportBackup: () => Promise<LocalBackup>;
  importBackup: (backup: LocalBackup) => Promise<void>;
  runSync: (options?: {
    days?: number;
    apiKey?: string;
    silent?: boolean;
  }) => Promise<SyncResult | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
}

const AuthContext = createContext<AppStateValue | null>(null);

function centroidFromRuns(runs: RunSummary[]): { lat: number; lon: number } | undefined {
  for (const r of [...runs].reverse()) {
    const track = r.track;
    if (!track?.length) continue;
    const mid = track[Math.floor(track.length / 2)];
    if (mid) return mid;
  }
  return undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [vo2, setVo2] = useState<Array<{ date: string; value: number }>>([]);
  const [races, setRaces] = useState<RaceEvent[]>([]);
  const [feedback, setFeedback] = useState<Record<string, RunFeedback>>({});
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [autoSync, setAutoSyncState] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const stateRef = useRef({
    profile,
    runs,
    vo2,
    races,
    feedback,
    lastSync,
    autoSync,
  });
  stateRef.current = { profile, runs, vo2, races, feedback, lastSync, autoSync };

  const refreshData = useCallback(async () => {
    const local = await loadLocalState();
    setProfile(local.profile ?? DEFAULT_PROFILE);
    setRuns(local.runs);
    setVo2(local.vo2);
    setRaces(local.races);
    setFeedback(local.feedback);
    setOnboardingDone(local.onboardingDone);
    setLastSync(local.lastSync);
    setAutoSyncState(local.autoSync);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refreshData();
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [refreshData]);

  const setProfileLocal = useCallback((p: Profile) => {
    setProfile(p);
    void saveLocalProfile(p);
  }, []);

  const setRunsLocal = useCallback((next: RunSummary[]) => {
    setRuns(next);
    void saveLocalRuns(next);
  }, []);

  const setVo2Local = useCallback((next: Array<{ date: string; value: number }>) => {
    setVo2(next);
    void saveLocalVo2(next);
  }, []);

  const setRacesLocal = useCallback((next: RaceEvent[]) => {
    setRaces(next);
    void saveLocalRaces(next);
  }, []);

  const setLastSyncLocal = useCallback((iso: string | null) => {
    setLastSync(iso);
    if (iso) void saveLocalLastSync(iso);
    else void clearLocalLastSync();
  }, []);

  const setAutoSync = useCallback(async (enabled: boolean) => {
    setAutoSyncState(enabled);
    await saveLocalAutoSync(enabled);
  }, []);

  const saveProfile = useCallback(async (p: Profile) => {
    setProfile(p);
    await saveLocalProfile(p);
  }, []);

  const saveRaces = useCallback(async (next: RaceEvent[]) => {
    setRaces(next);
    await saveLocalRaces(next);
  }, []);

  const setRunFeedback = useCallback(async (runId: string, next: RunFeedback) => {
    setFeedback((prev) => {
      const merged = { ...prev, [runId]: { ...prev[runId], ...next } };
      void saveLocalFeedback(merged);
      return merged;
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    setOnboardingDone(true);
    await saveOnboardingDone(true);
  }, []);

  const exportBackup = useCallback(async () => buildLocalBackup(), []);

  const importBackup = useCallback(async (backup: LocalBackup) => {
    await applyLocalBackup(backup);
    await refreshData();
  }, [refreshData]);

  const runSync = useCallback(
    async (options?: { days?: number; apiKey?: string; silent?: boolean }) => {
      if (syncingRef.current) return null;
      const key = options?.apiKey?.trim() || (await getGarminApiKey());
      if (!key) {
        if (!options?.silent) setSyncError("Brak klucza Garmin.");
        return null;
      }

      syncingRef.current = true;
      setSyncing(true);
      setSyncError(null);
      setSyncProgress({ phase: "token" });
      try {
        const ignoredIds = await loadIgnoredActivityIds();
        const snapshot = stateRef.current;
        const result = await runGarminSync({
          apiKey: key,
          days: options?.days ?? 90,
          known: snapshot.runs.map((r) => ({ id: r.id, startTime: r.startTime })),
          ignoredIds,
          onProgress: setSyncProgress,
        });
        // Po długim syncu bierz najnowszy stan (edycje profilu w trakcie)
        const latest = stateRef.current;
        const merged = mergeSyncIntoState(result, {
          profile: latest.profile,
          runs: latest.runs,
          vo2: latest.vo2,
          lastSync: latest.lastSync,
        });
        const geo = centroidFromRuns(merged.runs);
        const profileWithGeo =
          geo && (merged.profile.lastLat !== geo.lat || merged.profile.lastLon !== geo.lon)
            ? { ...merged.profile, lastLat: geo.lat, lastLon: geo.lon }
            : merged.profile;
        setProfile(profileWithGeo);
        setRuns(merged.runs);
        setVo2(merged.vo2);
        setLastSync(merged.lastSync);
        if (merged.ignoredIds.length) {
          await saveIgnoredActivityIds([...ignoredIds, ...merged.ignoredIds]);
        }
        await Promise.all([
          saveLocalProfile(profileWithGeo),
          saveLocalRuns(merged.runs),
          saveLocalVo2(merged.vo2),
          merged.lastSync
            ? saveLocalLastSync(merged.lastSync)
            : Promise.resolve(),
        ]);
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Synchronizacja nieudana";
        setSyncError(message);
        throw e;
      } finally {
        syncingRef.current = false;
        setSyncing(false);
        setSyncProgress(null);
      }
    },
    [],
  );

  const tryAutoSync = useCallback(async () => {
    const current = stateRef.current;
    if (!shouldAutoSync(current.lastSync, current.autoSync)) return;
    const key = await getGarminApiKey();
    if (!key) return;
    try {
      await runSync({ silent: true, days: 30 });
    } catch {
      // cichy auto-sync — błąd w syncError
    }
  }, [runSync]);

  useEffect(() => {
    if (!ready) return;
    void tryAutoSync();
    const onChange = (next: AppStateStatus) => {
      if (next === "active") void tryAutoSync();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [ready, tryAutoSync]);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      configured: false,
      session: null,
      user: null,
      profile,
      runs,
      vo2,
      races,
      feedback,
      onboardingDone,
      lastSync,
      autoSync,
      syncing,
      syncProgress,
      syncError,
      refreshData,
      setProfileLocal,
      setRunsLocal,
      setVo2Local,
      setRacesLocal,
      setLastSyncLocal,
      setAutoSync,
      runSync,
      setRunFeedback,
      completeOnboarding,
      exportBackup,
      importBackup,
      signIn: async () => {
        throw new Error("Logowanie jest tymczasowo wyłączone.");
      },
      signUp: async () => {
        throw new Error("Rejestracja jest tymczasowo wyłączona.");
      },
      signOut: async () => {},
      saveProfile,
      saveRaces,
    }),
    [
      ready,
      profile,
      runs,
      vo2,
      races,
      feedback,
      onboardingDone,
      lastSync,
      autoSync,
      syncing,
      syncProgress,
      syncError,
      refreshData,
      setProfileLocal,
      setRunsLocal,
      setVo2Local,
      setRacesLocal,
      setLastSyncLocal,
      setAutoSync,
      runSync,
      setRunFeedback,
      completeOnboarding,
      exportBackup,
      importBackup,
      saveProfile,
      saveRaces,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth poza AuthProvider");
  return ctx;
}
