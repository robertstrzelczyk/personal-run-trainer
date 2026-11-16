"use client";

import { useState } from "react";
import { CloudDownload, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { syncGarmin, type SyncProgress } from "@/lib/garmin/client";
import { actions, useAppState } from "@/lib/store";

const PHASE_LABEL: Record<SyncProgress["phase"], string> = {
  token: "Logowanie kluczem API…",
  list: "Pobieram listę biegów…",
  download: "Pobieram i analizuję biegi…",
  metrics: "Pobieram VO2max i strefy tętna…",
};

export function GarminSync() {
  const state = useAppState();
  const [apiKey, setApiKey] = useState("");
  const [days, setDays] = useState("90");
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = progress !== null;

  async function run() {
    setError(null);
    setProgress({ phase: "token" });
    try {
      const result = await syncGarmin({
        apiKey: apiKey.trim(),
        days: Number(days),
        known: state.runs.filter((r) => r.source !== "demo").map((r) => ({ id: r.id, startTime: r.startTime })),
        onProgress: setProgress,
      });
      const added = actions.addRuns(result.runs);
      if (result.vo2.length) actions.setGarminVo2(result.vo2);
      else actions.markGarminSync();
      if (result.maxHr || result.restHr) {
        const p = state.profile;
        actions.setProfile({
          ...p,
          maxHr: result.maxHr ?? p.maxHr,
          restHr: result.restHr ?? p.restHr,
        });
      }
      toast.success(`Synchronizacja zakończona: ${added} nowych biegów`, {
        description: [
          result.alreadyKnown ? `${result.alreadyKnown} było już w aplikacji.` : "",
          result.vo2.length ? `VO2max z Garmin: ${result.vo2.at(-1)!.value}.` : "",
          result.maxHr ? `Tętno max i spoczynkowe zaktualizowane z Garmin.` : "",
          result.failed ? `${result.failed} aktywności nie udało się odczytać.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      });
      result.warnings.forEach((w) => toast.warning(w));
      setApiKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zsynchronizować");
    } finally {
      setProgress(null);
    }
  }

  const pct = progress?.phase === "download" && progress.total ? Math.round(((progress.done ?? 0) / progress.total) * 100) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudDownload className="size-5" />
          Synchronizacja z Garmin Connect
        </CardTitle>
        <CardDescription>
          Oficjalny Personal API Garmina: tylko odczyt Twoich własnych danych (biegi, VO2max, strefy tętna).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="garmin-key" className="flex items-center gap-1.5">
              <KeyRound className="size-3.5" />
              Personal API Key
            </Label>
            <Input
              id="garmin-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="Wklej klucz z Garmin Connect"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Garmin Connect (strona www), Ustawienia, Personal API Key, Utwórz klucz. Na telefonie otwórz
              connect.garmin.com w przeglądarce i włącz „Wersję na komputer” w menu. Klucz jest używany tylko do tej
              synchronizacji i nie jest nigdzie zapisywany.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="garmin-days">Zakres historii</Label>
            <select
              id="garmin-days"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={busy}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-60"
            >
              <option value="30">Ostatnie 30 dni</option>
              <option value="90">Ostatnie 90 dni</option>
              <option value="180">Ostatnie 180 dni</option>
              <option value="365">Ostatni rok</option>
            </select>
          </div>
          {busy && (
            <div className="flex flex-col gap-2" role="status">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {PHASE_LABEL[progress.phase]}
                {progress.phase === "download" && progress.total !== undefined && ` ${progress.done}/${progress.total}`}
              </p>
              {pct !== undefined && <Progress value={pct} />}
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy || apiKey.trim().length < 8}>
              Synchronizuj
            </Button>
            {state.lastGarminSync && (
              <span className="text-xs text-muted-foreground">
                Ostatnia synchronizacja:{" "}
                {new Date(state.lastGarminSync).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
