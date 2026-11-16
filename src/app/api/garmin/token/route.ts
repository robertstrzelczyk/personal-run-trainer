import { obtainToken } from "@/lib/garmin/personal-api";
import { readJson, respond } from "@/lib/garmin/route-utils";

export async function POST(request: Request) {
  return respond(async () => {
    const body = await readJson(request);
    const token = await obtainToken(String(body.apiKey ?? "").trim());
    return { token };
  });
}
