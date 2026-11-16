import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Profile, RunSummary } from "./types";
import {
  loadLocalState,
  saveLocalLastSync,
  saveLocalProfile,
  saveLocalRuns,
  saveLocalVo2,
} from "./local-store";

const DEFAULT_PROFILE: Profile = {
  age: 35,
  sex: "male",
  maxHr: 185,
  restHr: 55,
  goal: "fitness",
  daysPerWeek: 4,
};

interface AppState {
  ready: boolean;
  /** Zostawione dla kompatybilności UI — na razie bez konta. */
  configured: boolean;
  session: null;
  user: null;
  profile: Profile;
  runs: RunSummary[];
  vo2: Array<{ date: string; value: number }>;
  lastSync: string | null;
  refreshData: () => Promise<void>;
  setProfileLocal: (p: Profile) => void;
  setRunsLocal: (runs: RunSummary[]) => void;
  setVo2Local: (vo2: Array<{ date: string; value: number }>) => void;
  setLastSyncLocal: (iso: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
}

const AuthContext = createContext<AppState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [vo2, setVo2] = useState<Array<{ date: string; value: number }>>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const local = await loadLocalState();
    setProfile(local.profile ?? DEFAULT_PROFILE);
    setRuns(local.runs);
    setVo2(local.vo2);
    setLastSync(local.lastSync);
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

  const value = useMemo<AppState>(
    () => ({
      ready,
      configured: true,
      session: null,
      user: null,
      profile,
      runs,
      vo2,
      lastSync,
      refreshData,
      setProfileLocal: setProfile,
      setRunsLocal,
      setVo2Local,
      setLastSyncLocal,
      signIn: async () => {
        throw new Error("Logowanie jest tymczasowo wyłączone.");
      },
      signUp: async () => {
        throw new Error("Rejestracja jest tymczasowo wyłączona.");
      },
      signOut: async () => {},
      saveProfile: async (p) => {
        setProfile(p);
        await saveLocalProfile(p);
      },
    }),
    [ready, profile, runs, vo2, lastSync, refreshData, setRunsLocal, setVo2Local, setLastSyncLocal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth poza AuthProvider");
  return ctx;
}
