"use client";

import { useSyncExternalStore } from "react";
import type { GarminVo2 } from "./analytics/fitness";
import { estimateMaxHr } from "./analytics/physiology";
import { generateDemoRuns } from "./demo";
import type { Profile, RunSummary } from "./types";

export interface AppState {
  hydrated: boolean;
  profile: Profile;
  runs: RunSummary[];
  garminVo2: GarminVo2[];
  lastGarminSync?: string;
}

const KEY = "biegowy-trener:v1";

export const DEFAULT_PROFILE: Profile = {
  age: 35,
  sex: "male",
  maxHr: estimateMaxHr(35),
  restHr: 55,
  goal: "10k",
  daysPerWeek: 4,
};

const SERVER_STATE: AppState = {
  hydrated: false,
  profile: DEFAULT_PROFILE,
  runs: [],
  garminVo2: [],
};

let state: AppState = SERVER_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return {
        hydrated: true,
        profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        runs: parsed.runs ?? [],
        garminVo2: parsed.garminVo2 ?? [],
        lastGarminSync: parsed.lastGarminSync,
      };
    }
  } catch {}
  return { ...SERVER_STATE, hydrated: true };
}

function persist() {
  try {
    const { hydrated: _hydrated, ...rest } = state;
    void _hydrated;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {}
}

function set(next: Partial<AppState>) {
  state = { ...state, ...next, hydrated: true };
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    state = load();
    queueMicrotask(() => listeners.forEach((l) => l()));
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

const SAME_RUN_WINDOW_MS = 90_000;

export function mergeRuns(existing: RunSummary[], incoming: RunSummary[]) {
  const result = [...existing];
  let added = 0;
  for (const run of incoming) {
    const t = new Date(run.startTime).getTime();
    const idx = result.findIndex(
      (r) => r.id === run.id || Math.abs(new Date(r.startTime).getTime() - t) < SAME_RUN_WINDOW_MS,
    );
    if (idx === -1) {
      result.push(run);
      added++;
    } else if (run.source === "garmin" || result[idx].source === "demo") {
      result[idx] = run;
    }
  }
  result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return { runs: result, added };
}

export const actions = {
  setProfile(profile: Profile) {
    set({ profile });
  },
  addRuns(incoming: RunSummary[]) {
    const { runs, added } = mergeRuns(state.runs, incoming);
    set({ runs });
    return added;
  },
  removeRun(id: string) {
    set({ runs: state.runs.filter((r) => r.id !== id) });
  },
  setGarminVo2(series: GarminVo2[]) {
    set({ garminVo2: series, lastGarminSync: new Date().toISOString() });
  },
  markGarminSync() {
    set({ lastGarminSync: new Date().toISOString() });
  },
  loadDemo() {
    const demo = generateDemoRuns(state.profile);
    const real = state.runs.filter((r) => r.source !== "demo");
    set({ runs: mergeRuns(real, demo).runs });
  },
  clearAll() {
    set({ runs: [], garminVo2: [], lastGarminSync: undefined });
  },
  clearDemo() {
    set({ runs: state.runs.filter((r) => r.source !== "demo") });
  },
};
