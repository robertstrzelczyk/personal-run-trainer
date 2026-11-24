export interface DayWeather {
  date: string;
  tempMaxC: number;
  precipMm: number;
  label: string;
  coachingNote?: string;
}

function coachingFromWeather(tempMaxC: number, precipMm: number): string | undefined {
  if (tempMaxC >= 28) {
    return "Upał — zwolnij easy o ~10–15 s/km i pij częściej.";
  }
  if (tempMaxC <= 0) {
    return "Mróz — dłuższa rozgrzewka, uważaj na śliskość.";
  }
  if (precipMm >= 5) {
    return "Deszcz — rozważ bieżnię albo krótszy easy zamiast jakości.";
  }
  return undefined;
}

function weatherLabel(tempMaxC: number, precipMm: number): string {
  if (precipMm >= 5) return `Deszcz · ${tempMaxC.toFixed(0)}°C`;
  if (tempMaxC >= 28) return `Upał · ${tempMaxC.toFixed(0)}°C`;
  if (tempMaxC <= 0) return `Zimno · ${tempMaxC.toFixed(0)}°C`;
  return `${tempMaxC.toFixed(0)}°C`;
}

/** Open-Meteo (bez klucza) — pogoda na dziś lokalnie. */
export async function fetchTodayWeather(
  lat: number,
  lon: number,
  _now: Date = new Date(),
): Promise<DayWeather | undefined> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}` +
    `&longitude=${lon.toFixed(4)}` +
    `&daily=temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) return undefined;
  const json = (await res.json()) as {
    daily?: {
      time?: string[];
      temperature_2m_max?: number[];
      precipitation_sum?: number[];
    };
  };
  const date = json.daily?.time?.[0];
  const temp = json.daily?.temperature_2m_max?.[0];
  const precip = json.daily?.precipitation_sum?.[0];
  if (date === undefined || temp === undefined || precip === undefined) return undefined;
  return {
    date,
    tempMaxC: temp,
    precipMm: precip,
    label: weatherLabel(temp, precip),
    coachingNote: coachingFromWeather(temp, precip),
  };
}
