import { assertToken } from "@/lib/garmin/personal-api";
import { readJson, respond } from "@/lib/garmin/route-utils";
import { activitiesForDays } from "@/lib/garmin/service";

export async function POST(request: Request) {
  return respond(async () => {
    const body = await readJson(request);
    const token = assertToken(body.token);
    return { activities: await activitiesForDays(token, body.days) };
  });
}
