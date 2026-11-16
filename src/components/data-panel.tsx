"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GarminFeasibility } from "@/components/garmin-feasibility";
import { GarminSync } from "@/components/garmin-sync";
import { ImportFit } from "@/components/import-fit";
import { ProfileForm } from "@/components/profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { actions, type AppState } from "@/lib/store";

export function DataPanel({ state }: { state: AppState }) {
  const hasDemo = state.runs.some((r) => r.source === "demo");
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GarminSync />
        <ImportFit />
      </div>
      <ProfileForm profile={state.profile} />
      <GarminFeasibility />
      <Card>
        <CardHeader>
          <CardTitle>Dane w tej przeglądarce</CardTitle>
          <CardDescription>
            Wszystko jest zapisane lokalnie w przeglądarce. Nie ma konta ani bazy danych.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {hasDemo && (
            <Button
              variant="outline"
              onClick={() => {
                actions.clearDemo();
                toast.success("Usunięto dane demo");
              }}
            >
              Usuń dane demo
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Usunąć wszystkie zapisane biegi z tego urządzenia?")) {
                actions.clearAll();
                toast.success("Usunięto wszystkie dane");
              }
            }}
          >
            <Trash2 data-icon="inline-start" />
            Usuń wszystkie biegi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
