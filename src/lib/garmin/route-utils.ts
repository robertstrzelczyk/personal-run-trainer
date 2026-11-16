import { GarminHttpError } from "./personal-api";

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object") return body as Record<string, unknown>;
  } catch {}
  throw new GarminHttpError(400, "Nieprawidłowe żądanie");
}

export async function respond<T>(work: () => Promise<T>) {
  try {
    return Response.json(await work(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof GarminHttpError) {
      return Response.json({ error: error.message }, { status: error.status === 401 ? 401 : error.status });
    }
    return Response.json({ error: "Nieoczekiwany błąd serwera" }, { status: 500 });
  }
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function clampDays(value: unknown, fallback: number, max: number) {
  const n = Number(value);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, Math.round(n)));
}
