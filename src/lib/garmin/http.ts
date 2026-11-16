interface HttpInit {
  method?: string;
  headers?: Record<string, string>;
}

/** Zapytania do Garmin Connect z telefonu (Expo) — zwykły fetch, bez CORS. */
export async function garminHttp(url: string, init: HttpInit = {}): Promise<Response> {
  return fetch(url, {
    method: init.method ?? "GET",
    headers: init.headers,
    cache: "no-store",
  });
}
