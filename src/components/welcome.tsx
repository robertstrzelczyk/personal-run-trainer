"use client";

import { Activity, Gauge, Sparkles } from "lucide-react";
import { GarminFeasibility } from "@/components/garmin-feasibility";
import { GarminSync } from "@/components/garmin-sync";
import { ImportFit } from "@/components/import-fit";
import { ProfileForm } from "@/components/profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { actions } from "@/lib/store";
import type { Profile } from "@/lib/types";

const FEATURES = [
  {
    icon: Gauge,
    title: "Stopień wytrenowania",
    text: "VO2max, poziom względem wieku i płci, prognozy wyników na 5 km, 10 km, półmaraton i maraton.",
  },
  {
    icon: Activity,
    title: "Efektywność biegu",
    text: "Metry na uderzenie serca, dryf tętna, kadencja i długość kroku z trendem w czasie.",
  },
  {
    icon: Sparkles,
    title: "Trening na dziś",
    text: "Propozycja dopasowana do formy, zmęczenia i celu, z tempami i plikiem do wgrania na zegarek.",
  },
];

export function Welcome({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 pt-4">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Osobisty trener biegania dla Twojego Garmina Venu 2 Plus
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Venu 2 Plus nie podpowiada, jak dziś biegać. Ta aplikacja czyta Twoje biegi, ocenia formę i układa
          trening na każdy dzień.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => actions.loadDemo()}>
            Zobacz na przykładowych danych
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <f.icon className="size-5 text-primary" />
              <CardTitle>{f.title}</CardTitle>
              <CardDescription>{f.text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <h2 className="text-xl font-semibold">Zacznij od swoich danych</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <GarminSync />
        <ImportFit />
      </div>
      <ProfileForm profile={profile} />
      <GarminFeasibility />
    </div>
  );
}
