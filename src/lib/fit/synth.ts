import { Encoder, Profile as FitProfile } from "@garmin/fitsdk";

export interface SynthRun {
  start: Date;
  durationS: number;
  paceSecPerKm: number;
  hr: number;
  /** wzrost tętna (bpm) od początku do końca biegu przy stałym tempie */
  hrDrift?: number;
  cadence?: number;
  sport?: string;
  /** odcinki szybkie: co ile sekund i jak długie */
  surge?: { everyS: number; lengthS: number; paceSecPerKm: number; hrBoost: number };
}

/** Syntetyczny plik FIT aktywności. Służy testom i lokalnemu serwerowi-atrapie Garmina. */
export function encodeSyntheticRun(run: SynthRun): Uint8Array {
  const enc = new Encoder();
  const write = (m: object) => enc.writeMesg(m as Parameters<Encoder["writeMesg"]>[0]);
  const startMs = run.start.getTime();
  write({
    mesgNum: FitProfile.MesgNum.FILE_ID,
    type: "activity",
    manufacturer: "garmin",
    product: 4005,
    serialNumber: 1234,
    timeCreated: run.start,
  });

  let dist = 0;
  let hrSum = 0;
  let hrMax = 0;
  for (let t = 0; t <= run.durationS; t++) {
    const inSurge = run.surge ? t % run.surge.everyS < run.surge.lengthS && t > 300 : false;
    const pace = inSurge ? run.surge!.paceSecPerKm : run.paceSecPerKm;
    const noise = Math.sin(t / 37) * 0.08;
    const speed = Math.max(0.5, 1000 / pace + noise);
    dist += speed;
    const warm = Math.min(1, t / 240);
    const hr = Math.round(
      run.hr * (0.82 + 0.18 * warm) +
        ((run.hrDrift ?? 0) * t) / run.durationS +
        (inSurge ? run.surge!.hrBoost : 0) +
        Math.sin(t / 53) * 1.5,
    );
    hrSum += hr;
    hrMax = Math.max(hrMax, hr);
    write({
      mesgNum: FitProfile.MesgNum.RECORD,
      timestamp: new Date(startMs + t * 1000),
      heartRate: hr,
      speed,
      distance: dist,
      cadence: Math.round((run.cadence ?? 168) / 2),
    });
  }

  const end = new Date(startMs + run.durationS * 1000);
  write({
    mesgNum: FitProfile.MesgNum.LAP,
    timestamp: end,
    startTime: run.start,
    totalElapsedTime: run.durationS,
    totalTimerTime: run.durationS,
    totalDistance: dist,
  });
  write({
    mesgNum: FitProfile.MesgNum.SESSION,
    timestamp: end,
    startTime: run.start,
    totalElapsedTime: run.durationS,
    totalTimerTime: run.durationS,
    totalDistance: dist,
    sport: run.sport ?? "running",
    subSport: "generic",
    avgHeartRate: Math.round(hrSum / (run.durationS + 1)),
    maxHeartRate: hrMax,
    avgCadence: Math.round((run.cadence ?? 168) / 2),
    totalAscent: 40,
    firstLapIndex: 0,
    numLaps: 1,
  });
  write({
    mesgNum: FitProfile.MesgNum.ACTIVITY,
    timestamp: end,
    totalTimerTime: run.durationS,
    numSessions: 1,
    type: "manual",
    event: "activity",
    eventType: "stop",
  });
  return enc.close();
}
