"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { metersPerBeat } from "@/lib/analytics/efficiency";
import { formatDuration, formatPace, paceOfRun } from "@/lib/analytics/physiology";
import type { RunSummary } from "@/lib/types";

const SOURCE_LABEL = { fit: "Plik FIT", garmin: "Garmin Connect", demo: "Dane demo" } as const;

export function RunsList({
  runs,
  loads,
  onRemove,
}: {
  runs: RunSummary[];
  loads: Map<string, number>;
  onRemove: (id: string) => void;
}) {
  const sorted = [...runs].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historia biegów</CardTitle>
        <CardDescription>{runs.length} aktywności zapisanych w tej przeglądarce</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 text-right font-medium">Dystans</th>
                <th className="py-2 pr-3 text-right font-medium">Czas</th>
                <th className="py-2 pr-3 text-right font-medium">Tempo</th>
                <th className="py-2 pr-3 text-right font-medium">Tętno</th>
                <th className="py-2 pr-3 text-right font-medium">m/ud.</th>
                <th className="py-2 pr-3 text-right font-medium">Obciążenie</th>
                <th className="py-2 pr-3 font-medium">Źródło</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((run) => {
                const mpb = metersPerBeat(run);
                return (
                  <tr key={run.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(run.startTime).toLocaleDateString("pl-PL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(run.distanceM / 1000).toFixed(2).replace(".", ",")} km</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatDuration(run.durationS)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatPace(paceOfRun(run))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{run.avgHr ?? "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{mpb ? mpb.toFixed(2).replace(".", ",") : "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{Math.round(loads.get(run.id) ?? 0)}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline">{SOURCE_LABEL[run.source]}</Badge>
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Usuń bieg"
                        onClick={() => onRemove(run.id)}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
