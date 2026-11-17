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
import type { Profile, RunSummary } from "./types";
import {
  loadLocalState,
  saveLocalAutoSync,
  saveLocalLastSync,
  saveLocalProfile,
  saveLocalRuns,
  saveLocalVo2,
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
  lastSync: string | null;
  autoSync: boolean;
  syncing: boolean;
  syncProgress: SyncProgress | null;
  syncError: string | null;
  refreshData: () => Promise<void>;
  setProfileLocal: (p: Profile) => void;
  setRunsLocal: (runs: RunSummary[]) => void;
  setVo2Local: (vo2: Array<{ date: string; value: number }>) => void;
  setLastSyncLocal: (iso: string | null) => void;
  setAutoSync: (enabled: boolean) => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [vo2, setVo2] = useState<Array<{ date: string; value: number }>>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [autoSync, setAutoSyncState] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const stateRef = useRef({ profile, runs, vo2, lastSync, autoSync });
  stateRef.current = { profile, runs, vo2, lastSync, autoSync };

  const refreshData = useCallback(async () => {
    const local = await loadLocalState();
    setProfile(local.profile ?? DEFAULT_PROFILE);
    setRuns(local.runs);
    setVo2(local.vo2);
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

  const setRunsLocal = useCallback((next: RunSummary[]) => {
    setRuns(next);
    void saveLocalRuns(next);
  }, []);

  const setVo2Local = useCallback((next: Array<{ date: string; value: number }>) => {
    setVo2(next);
    void saveLocalVo2(next);
  }, []);

  const setLastSyncLocal = useCallback((iso: string | null) => {
    setLastSync(iso);
    if (iso) void saveLocalLastSync(iso);
  }, []);

  const setAutoSync = useCallback(async (enabled: boolean) => {
    setAutoSyncState(enabled);
    await saveLocalAutoSync(enabled);
  }, []);

  const saveProfile = useCallback(async (p: Profile) => {
    setProfile(p);
    await saveLocalProfile(p);
  }, []);

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
        const current = stateRef.current;
        const result = await runGarminSync({
          apiKey: key,
          days: options?.days ?? 90,
          known: current.runs.map((r) => ({ id: r.id, startTime: r.startTime })),
          onProgress: setSyncProgress,
        });
        const merged = mergeSyncIntoState(result, {
          profile: current.profile,
          runs: current.runs,
          vo2: current.vo2,
        });
        setProfile(merged.profile);
        setRuns(merged.runs);
        setVo2(merged.vo2);
        setLastSync(merged.lastSync);
        await Promise.all([
          saveLocalProfile(merged.profile),
          saveLocalRuns(merged.runs),
          saveLocalVo2(merged.vo2),
          saveLocalLastSync(merged.lastSync),
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
      configured: true,
      session: null,
      user: null,
      profile,
      runs,
      vo2,
      lastSync,
      autoSync,
      syncing,
      syncProgress,
      syncError,
      refreshData,
      setProfileLocal: setProfile,
      setRunsLocal,
      setVo2Local,
      setLastSyncLocal,
      setAutoSync,
      runSync,
      signIn: async () => {
        throw new Error("Logowanie jest tymczasowo wyłączone.");
      },
      signUp: async () => {
        throw new Error("Rejestracja jest tymczasowo wyłączona.");
      },
      signOut: async () => {},
      saveProfile,
    }),
    [
      ready,
      profile,
      runs,
      vo2,
      lastSync,
      autoSync,
      syncing,
      syncProgress,
      syncError,
      refreshData,
      setRunsLocal,
      setVo2Local,
      setLastSyncLocal,
      setAutoSync,
      runSync,
      saveProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth poza AuthProvider");
  return ctx;
}
