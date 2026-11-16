"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { estimateMaxHr } from "@/lib/analytics/physiology";
import { actions } from "@/lib/store";
import type { Goal, Profile, Sex } from "@/lib/types";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function NumberField({
  id,
  label,
  value,
  min,
  max,
  suffix,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);
  const commit = () => {
    const n = Math.round(Number(text));
    if (isFinite(n) && n >= min && n <= max) onCommit(n);
    setDraft(null);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="numeric"
          value={text}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-24"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

const GOALS: Array<[Goal, string]> = [
  ["fitness", "Ogólna sprawność"],
  ["5k", "5 km"],
  ["10k", "10 km"],
  ["half", "Półmaraton"],
  ["marathon", "Maraton"],
];

export function ProfileForm({ profile }: { profile: Profile }) {
  const update = (patch: Partial<Profile>) => actions.setProfile({ ...profile, ...patch });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Twój profil</CardTitle>
        <CardDescription>Na tej podstawie liczę strefy tętna, poziom sprawności i plan treningowy.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="age" label="Wiek" value={profile.age} min={14} max={90} suffix="lat" onCommit={(age) => update({ age })} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sex">Płeć</Label>
            <select id="sex" className={selectClass} value={profile.sex} onChange={(e) => update({ sex: e.target.value as Sex })}>
              <option value="male">Mężczyzna</option>
              <option value="female">Kobieta</option>
            </select>
          </div>
          <NumberField id="maxhr" label="Tętno maksymalne" value={profile.maxHr} min={130} max={230} suffix="bpm" onCommit={(maxHr) => update({ maxHr })} />
          <NumberField id="resthr" label="Tętno spoczynkowe" value={profile.restHr} min={30} max={100} suffix="bpm" onCommit={(restHr) => update({ restHr })} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal">Cel</Label>
            <select id="goal" className={selectClass} value={profile.goal} onChange={(e) => update({ goal: e.target.value as Goal })}>
              {GOALS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="days">Dni biegowe w tygodniu</Label>
            <select
              id="days"
              className={selectClass}
              value={profile.daysPerWeek}
              onChange={(e) => update({ daysPerWeek: Number(e.target.value) })}
            >
              {[2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => update({ maxHr: estimateMaxHr(profile.age) })}>
            Oszacuj tętno max z wieku ({estimateMaxHr(profile.age)})
          </Button>
          <p className="text-xs text-muted-foreground">
            Dokładniejsze będzie tętno z Garmin Connect (po synchronizacji uzupełnię je automatycznie).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
