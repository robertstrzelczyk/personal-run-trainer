import { randomBytes } from "node:crypto";
import http from "node:http";
import { zipSync } from "fflate";
import { encodeSyntheticRun } from "../src/lib/fit/synth";

/**
 * Lokalna atrapa Garmin Connect Personal API do testów bez prawdziwego konta.
 * Klucz API jest losowany przy starcie i wypisywany w konsoli (albo ustaw MOCK_GARMIN_API_KEY).
 * Uruchomienie: npm run mock:garmin, potem GARMIN_PERSONAL_API_BASE_URL=http://127.0.0.1:4719 npm run dev
 */
const PORT = Number(process.env.MOCK_GARMIN_PORT ?? 4719);
const API_KEY = process.env.MOCK_GARMIN_API_KEY ?? `mock-${randomBytes(8).toString("hex")}`;
const TOKEN = `mock.${randomBytes(12).toString("hex")}`;

interface MockActivity {
  id: number;
  start: Date;
  durationS: number;
  pace: number;
  hr: number;
  drift: number;
  kind: "run" | "bike";
  surge?: boolean;
}

const activities: MockActivity[] = [];
const now = Date.now();
const kinds: Array<[number, number, number, number, number, boolean]> = [
  [2, 40, 385, 142, 4, false],
  [4, 50, 340, 158, 6, true],
  [6, 35, 390, 140, 3, false],
  [7, 85, 400, 146, 8, false],
];
let id = 9_000_000_000;
for (let week = 7; week >= 0; week--) {
  kinds.forEach(([daysAgoInWeek, minutes, pace, hr, drift, surge]) => {
    const daysAgo = week * 7 + daysAgoInWeek + 1;
    const start = new Date(now - daysAgo * 86_400_000);
    start.setHours(7, 30, 0, 0);
    activities.push({
      id: id++,
      start,
      durationS: minutes * 60,
      pace: pace * (1 - 0.003 * (7 - week)),
      hr,
      drift,
      kind: "run",
      surge,
    });
  });
}
activities.push({
  id: id++,
  start: new Date(now - 86_400_000 * 2),
  durationS: 3000,
  pace: 120,
  hr: 120,
  drift: 0,
  kind: "bike",
});

const cache = new Map<number, Uint8Array>();
function zipFor(a: MockActivity) {
  if (!cache.has(a.id)) {
    const fit = encodeSyntheticRun({
      start: a.start,
      durationS: a.durationS,
      paceSecPerKm: a.pace,
      hr: a.hr,
      hrDrift: a.drift,
      cadence: 168,
      sport: a.kind === "bike" ? "cycling" : "running",
      surge: a.surge
        ? { everyS: 360, lengthS: 180, paceSecPerKm: a.pace * 0.82, hrBoost: 16 }
        : undefined,
    });
    cache.set(a.id, zipSync({ [`${a.id}_ACTIVITY.fit`]: fit }));
  }
  return cache.get(a.id)!;
}

function authorized(req: http.IncomingMessage) {
  return req.headers.authorization === `Bearer ${TOKEN}`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.method === "POST" && url.pathname.endsWith("/personal-api-key/token")) {
    if (req.headers.authorization === `ApiKey ${API_KEY}`) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(TOKEN);
    } else {
      json(401, { message: "invalid key" });
    }
    return;
  }
  if (!authorized(req)) return json(401, { message: "unauthorized" });

  if (url.pathname === "/activitylist-service/activities/search/activities") {
    const start = Number(url.searchParams.get("start") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const slice = [...activities]
      .sort((a, b) => b.start.getTime() - a.start.getTime())
      .slice(start, start + limit)
      .map((a) => ({
        activityId: a.id,
        activityName: a.kind === "bike" ? "Jazda rowerem" : "Bieg",
        startTimeGMT: a.start.toISOString().slice(0, 19).replace("T", " "),
        activityType: { typeKey: a.kind === "bike" ? "cycling" : "running" },
        distance: (a.durationS / a.pace) * 1000,
        duration: a.durationS,
      }));
    return json(200, slice);
  }
  const dl = url.pathname.match(/^\/download-service\/files\/activity\/(\d+)$/);
  if (dl) {
    const a = activities.find((x) => x.id === Number(dl[1]));
    if (!a) return json(404, {});
    res.writeHead(200, { "Content-Type": "application/zip" });
    res.end(Buffer.from(zipFor(a)));
    return;
  }
  if (url.pathname.startsWith("/metrics-service/metrics/maxmet/daily/")) {
    const today = new Date().toISOString().slice(0, 10);
    return json(200, [{ generic: { calendarDate: today, vo2MaxPreciseValue: 47.3, vo2MaxValue: 47 } }]);
  }
  if (url.pathname === "/biometric-service/heartRateZones/v2") {
    return json(200, [
      { sport: "DEFAULT", maxHeartRateUsed: 187, restingHeartRateUsed: 52, zone1Floor: 94 },
    ]);
  }
  json(404, { message: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock Garmin Personal API: http://127.0.0.1:${PORT} (klucz: ${API_KEY})`);
});
