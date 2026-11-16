import { Capacitor, CapacitorHttp } from "@capacitor/core";

interface HttpInit {
  method?: string;
  headers?: Record<string, string>;
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Zapytania do Garmin Connect. W aplikacji mobilnej idą natywnym klientem HTTP
 * (bez CORS i bez własnego serwera), w przeglądarce i na serwerze zwykłym fetch.
 */
export async function garminHttp(url: string, init: HttpInit = {}): Promise<Response> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({
      url,
      method: init.method ?? "GET",
      headers: init.headers,
      responseType: "arraybuffer",
    });
    const body = typeof res.data === "string" ? base64ToBytes(res.data) : new Uint8Array();
    const empty = res.status === 204 || res.status === 205 || res.status === 304;
    return new Response(empty ? null : body, { status: res.status });
  }
  return fetch(url, { method: init.method, headers: init.headers, cache: "no-store" });
}
