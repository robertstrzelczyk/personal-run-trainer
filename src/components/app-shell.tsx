"use client";

import { useState } from "react";
import { Activity, Database, Gauge, HeartPulse, ListChecks, Sparkles } from "lucide-react";
import { DataPanel } from "@/components/data-panel";
import { EfficiencyCard } from "@/components/efficiency-card";
import { FitnessCard } from "@/components/fitness-card";
import { FormCard } from "@/components/form-card";
import { RunsList } from "@/components/runs-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodayCard } from "@/components/today-card";
import { Welcome } from "@/components/welcome";
import { actions, useAppState } from "@/lib/store";
import { useAnalysis } from "@/lib/use-analysis";

function Header() {
  return (
    <header className="border-b bg-card pt-(--safe-top)">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <HeartPulse className="size-5" />
        </span>
        <div>
          <p className="font-semibold leading-tight">Trener biegowy</p>
          <p className="text-xs text-muted-foreground">Garmin Venu 2 Plus</p>
        </div>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4 pt-6" aria-busy="true">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const TAB_TRIGGER =
  "h-14 flex-col gap-0.5 rounded-none px-1 text-[11px] sm:h-auto sm:flex-row sm:gap-1.5 sm:rounded-md sm:px-3 sm:text-sm";

export function AppShell() {
  const state = useAppState();
  const analysis = useAnalysis(state);
  const [tab, setTab] = useState("today");

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(6rem+var(--safe-bottom))] pt-4 sm:pb-24">
        {!state.hydrated ? (
          <LoadingState />
        ) : !analysis ? (
          <Welcome profile={state.profile} />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="gap-4">
            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-(--safe-bottom) sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:pb-0">
              <TabsList className="grid h-auto! w-full grid-cols-5 rounded-none bg-transparent p-0 sm:flex sm:h-8! sm:w-max sm:rounded-lg sm:bg-muted sm:p-[3px]">
                <TabsTrigger value="today" className={TAB_TRIGGER}>
                  <Sparkles className="size-5 sm:size-4" />
                  Dziś
                </TabsTrigger>
                <TabsTrigger value="fitness" className={TAB_TRIGGER}>
                  <Gauge className="size-5 sm:size-4" />
                  <span className="sm:hidden">Forma</span>
                  <span className="hidden sm:inline">Poziom i forma</span>
                </TabsTrigger>
                <TabsTrigger value="efficiency" className={TAB_TRIGGER}>
                  <Activity className="size-5 sm:size-4" />
                  <span className="sm:hidden">Bieg</span>
                  <span className="hidden sm:inline">Efektywność</span>
                </TabsTrigger>
                <TabsTrigger value="runs" className={TAB_TRIGGER}>
                  <ListChecks className="size-5 sm:size-4" />
                  Biegi
                </TabsTrigger>
                <TabsTrigger value="data" className={TAB_TRIGGER}>
                  <Database className="size-5 sm:size-4" />
                  <span className="sm:hidden">Dane</span>
                  <span className="hidden sm:inline">Dane i profil</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {state.runs.every((r) => r.source === "demo") && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span>Widzisz przykładowe dane. Wczytaj własne biegi, aby dostać prawdziwy plan.</span>
                <button className="font-medium underline underline-offset-2" onClick={() => setTab("data")}>
                  Wczytaj moje dane
                </button>
              </div>
            )}

            <TabsContent value="today" className="flex flex-col gap-4">
              <TodayCard rec={analysis.recommendation} />
            </TabsContent>
            <TabsContent value="fitness" className="flex flex-col gap-4">
              <FitnessCard fitness={analysis.fitness} age={state.profile.age} />
              <FormCard form={analysis.form} series={analysis.series} weeks={analysis.weeks} />
            </TabsContent>
            <TabsContent value="efficiency">
              <EfficiencyCard efficiency={analysis.efficiency} />
            </TabsContent>
            <TabsContent value="runs">
              <RunsList runs={state.runs} loads={analysis.loads} onRemove={actions.removeRun} />
            </TabsContent>
            <TabsContent value="data">
              <DataPanel state={state} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
