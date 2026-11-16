import type { Goal, Sex } from "../types";

export interface ProfileRow {
  id: string;
  email: string | null;
  age: number;
  sex: Sex;
  max_hr: number;
  rest_hr: number;
  goal: Goal;
  days_per_week: number;
  created_at?: string;
  updated_at?: string;
}

export interface RunRow {
  id: string;
  user_id: string;
  garmin_id: string | null;
  source: string;
  name: string | null;
  start_time: string;
  distance_m: number;
  duration_s: number;
  avg_hr: number | null;
  max_hr: number | null;
  avg_speed: number;
  avg_cadence: number | null;
  ascent_m: number | null;
  decoupling_pct: number | null;
  hr_hist: Record<string, number> | null;
  best: Record<string, number> | null;
  trimp: number | null;
  created_at?: string;
}

export interface DailyMetricRow {
  id?: string;
  user_id: string;
  date: string;
  vo2max: number;
}

export interface SyncStateRow {
  user_id: string;
  last_synced_at: string | null;
  last_days: number | null;
}
