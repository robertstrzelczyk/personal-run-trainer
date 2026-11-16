import { runLoad } from "../analytics/load";
import type { Profile, RunSummary } from "../types";
import { supabase } from "./client";
import type { DailyMetricRow, ProfileRow, RunRow } from "./types";

function profileFromRow(row: ProfileRow): Profile {
  return {
    age: row.age,
    sex: row.sex,
    maxHr: row.max_hr,
    restHr: row.rest_hr,
    goal: row.goal,
    daysPerWeek: row.days_per_week,
  };
}

function runFromRow(row: RunRow): RunSummary {
  return {
    id: row.id,
    source: row.source as RunSummary["source"],
    name: row.name ?? undefined,
    startTime: row.start_time,
    distanceM: row.distance_m,
    durationS: row.duration_s,
    avgHr: row.avg_hr ?? undefined,
    maxHr: row.max_hr ?? undefined,
    avgSpeed: row.avg_speed,
    avgCadence: row.avg_cadence ?? undefined,
    ascentM: row.ascent_m ?? undefined,
    decouplingPct: row.decoupling_pct ?? undefined,
    hrHist: row.hr_hist ?? undefined,
    best: row.best ?? undefined,
  };
}

function runToRow(userId: string, run: RunSummary, profile: Profile): RunRow {
  const garminId = run.id.startsWith("garmin-") ? run.id.slice("garmin-".length) : null;
  return {
    id: run.id,
    user_id: userId,
    garmin_id: garminId,
    source: run.source,
    name: run.name ?? null,
    start_time: run.startTime,
    distance_m: run.distanceM,
    duration_s: run.durationS,
    avg_hr: run.avgHr ?? null,
    max_hr: run.maxHr ?? null,
    avg_speed: run.avgSpeed,
    avg_cadence: run.avgCadence ?? null,
    ascent_m: run.ascentM ?? null,
    decoupling_pct: run.decouplingPct ?? null,
    hr_hist: run.hrHist ?? null,
    best: run.best ?? null,
    trimp: runLoad(run, profile),
  };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? profileFromRow(data as ProfileRow) : null;
}

export async function upsertProfile(userId: string, profile: Profile, email?: string | null) {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    email: email ?? null,
    age: profile.age,
    sex: profile.sex,
    max_hr: profile.maxHr,
    rest_hr: profile.restHr,
    goal: profile.goal,
    days_per_week: profile.daysPerWeek,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function fetchRuns(userId: string): Promise<RunSummary[]> {
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RunRow[]).map(runFromRow);
}

export async function upsertRuns(userId: string, runs: RunSummary[], profile: Profile) {
  if (!runs.length) return;
  const rows = runs.map((r) => runToRow(userId, r, profile));
  const { error } = await supabase.from("runs").upsert(rows);
  if (error) throw error;
}

export async function fetchVo2(userId: string): Promise<Array<{ date: string; value: number }>> {
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, vo2max")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Pick<DailyMetricRow, "date" | "vo2max">[]).map((r) => ({
    date: r.date,
    value: r.vo2max,
  }));
}

export async function upsertVo2(userId: string, points: Array<{ date: string; value: number }>) {
  if (!points.length) return;
  const rows = points.map((p) => ({ user_id: userId, date: p.date, vo2max: p.value }));
  const { error } = await supabase.from("daily_metrics").upsert(rows, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function markSynced(userId: string, days: number) {
  const { error } = await supabase.from("sync_state").upsert({
    user_id: userId,
    last_synced_at: new Date().toISOString(),
    last_days: days,
  });
  if (error) throw error;
}

export async function fetchLastSync(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("sync_state")
    .select("last_synced_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { last_synced_at: string | null } | null)?.last_synced_at ?? null;
}
