"use client";

import { useState } from "react";
import { CalendarDays, Clipboard, Download, Footprints, Info, Moon, Route, Timer, Watch } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkoutView } from "@/components/workout-view";
import { formatMinutes } from "@/lib/analytics/physiology";
import { workoutToText } from "@/lib/coach/describe";
import type { Recommendation } from "@/lib/coach/recommend";
import { encodeWorkoutFit, workoutFileName } from "@/lib/fit/encode-workout";
import { isNativeApp } from "@/lib/platform";
import { copyText, deliverFile } from "@/lib/share-file";
import type { Workout, WorkoutType } from "@/lib/types";

const TYPE_LABELS: Record<WorkoutType, { label: string; className: string }> = {
  rest: { label: "Odpoczynek", className: "bg-slate-100 text-slate-700" },
  recovery: { label: "Regeneracja", className: "bg-sky-100 text-sky-800" },
  easy: { label: "Spokojny", className: "bg-emerald-100 text-emerald-800" },
  long: { label: "Długi bieg", className: "bg-indigo-100 text-indigo-800" },
  tempo: { label: "Tempo", className: "bg-orange-100 text-orange-800" },
  intervals: { label: "Interwały", className: "bg-red-100 text-red-800" },
  fartlek: { label: "Fartlek", className: "bg-amber-100 text-amber-800" },
  speed: { label: "Szybkość", className: "bg-rose-100 text-rose-800" },
  progression: { label: "Progresja", className: "bg-violet-100 text-violet-800" },
  marathon: { label: "Tempo maratońskie", className: "bg-fuchsia-100 text-fuchsia-800" },
  first: { label: "Rozruch", className: "bg-teal-100 text-teal-800" },
};

async function downloadWorkout(workout: Workout, date: Date) {
  try {
    const result = await deliverFile(workoutFileName(workout, date), encodeWorkoutFit(workout));
    if (result === "downloaded") {
      toast.success("Plik treningu pobrany", {
        description: "Skopiuj go na zegarek przez USB. Instrukcja jest poniżej.",
      });
    }
  } catch (error) {
    const cancelled = error instanceof Error && /cancel/i.test(error.message);
    if (!cancelled) toast.error("Nie udało się przygotować pliku treningu");
  }
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function TodayCard({ rec }: { rec: Recommendation }) {
  const [showAlt, setShowAlt] = useState(false);
  const workout = showAlt && rec.alternative ? rec.alternative : rec.workout;
  const isRest = workout.type === "rest";
  const type = TYPE_LABELS[workout.type];
  const dateLabel = rec.forDate.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <CalendarDays className="size-3" />
            {rec.forTomorrow ? "Jutro, " : "Dziś, "}
            {dateLabel}
          </Badge>
          <Badge className={type.className}>{type.label}</Badge>
        </div>
        {rec.forTomorrow && (
          <p className="text-sm text-muted-foreground">
            Dzisiejszy bieg już zaliczony, więc proponuję trening na jutro.
          </p>
        )}
        <CardTitle className="text-2xl leading-tight">{workout.title}</CardTitle>
        <CardDescription className="text-base">{workout.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!isRest && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat icon={<Timer className="size-4" />} label="Czas" value={formatMinutes(workout.totalS)} />
            <Stat
              icon={<Route className="size-4" />}
              label="Dystans (ok.)"
              value={`${(workout.totalM / 1000).toFixed(1).replace(".", ",")} km`}
            />
            <Stat
              icon={<Footprints className="size-4" />}
              label="Tygodniowy kilometraż"
              value={`${rec.weeklyKm.toFixed(0)} km`}
            />
          </div>
        )}

        {isRest && (
          <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-4">
            <Moon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Regeneracja to część treningu. Jeśli koniecznie chcesz się ruszyć, wybierz alternatywę poniżej.
            </p>
          </div>
        )}

        <WorkoutView workout={workout} />

        <section aria-labelledby="why-heading">
          <h3 id="why-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Info className="size-4 text-muted-foreground" />
            Dlaczego ten trening
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {rec.workout.rationale.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {!isRest && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => downloadWorkout(workout, rec.forDate)}>
                <Download data-icon="inline-start" />
                {isNativeApp() ? "Udostępnij plik .fit" : "Pobierz plik .fit"}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (await copyText(workoutToText(workout))) toast.success("Opis treningu skopiowany");
                  else toast.error("Nie udało się skopiować opisu");
                }}
              >
                <Clipboard data-icon="inline-start" />
                Kopiuj opis
              </Button>
            </div>
            <details className="group rounded-lg border p-3 text-sm">
              <summary className="flex cursor-pointer items-center gap-2 font-medium">
                <Watch className="size-4" />
                Jak przenieść trening na Venu 2 Plus
              </summary>
              <div className="mt-3 flex flex-col gap-4 text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Z telefonu (aplikacja Garmin Connect)</p>
                  <ol className="mt-1.5 flex list-decimal flex-col gap-1.5 pl-5">
                    <li>Dotknij „Kopiuj opis” powyżej.</li>
                    <li>
                      W aplikacji Garmin Connect wybierz Więcej, Trening i planowanie, Treningi, Utwórz trening, Bieganie.
                    </li>
                    <li>Dodaj kroki z opisu (czas lub dystans, cel tempa lub tętna) i zapisz.</li>
                    <li>Zsynchronizuj zegarek. Trening pojawi się w Bieganie, Treningi.</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium text-foreground">Z komputera (plik .fit)</p>
                  <ol className="mt-1.5 flex list-decimal flex-col gap-1.5 pl-5">
                    <li>Pobierz plik, podłącz zegarek kablem USB i skopiuj plik do folderu <code className="font-mono text-xs">GARMIN/NewFiles</code>.</li>
                    <li>Odłącz zegarek. Trening pojawi się w Bieganie, Treningi.</li>
                  </ol>
                </div>
                <p className="text-xs">
                  Garmin nie udostępnia indywidualnym użytkownikom API do wysyłania treningów, dlatego przeniesienie
                  jest ręczne.
                </p>
              </div>
            </details>
          </div>
        )}

        {rec.alternative && (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowAlt((v) => !v)}>
            {showAlt ? "Wróć do głównej propozycji" : `Alternatywa: ${rec.alternative.title}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
