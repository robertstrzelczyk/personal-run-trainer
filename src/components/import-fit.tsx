"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { unzipSync } from "fflate";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotARunError, parseRunFit } from "@/lib/fit/parse-run";
import { actions } from "@/lib/store";
import type { RunSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

async function readFitFiles(file: File): Promise<Array<{ name: string; bytes: Uint8Array }>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".zip")) {
    const entries = unzipSync(bytes);
    return Object.entries(entries)
      .filter(([name]) => name.toLowerCase().endsWith(".fit"))
      .map(([name, data]) => ({ name, bytes: data }));
  }
  return [{ name: file.name, bytes }];
}

export function importFitFiles(files: File[]) {
  return (async () => {
    const runs: RunSummary[] = [];
    let skipped = 0;
    const errors: string[] = [];
    for (const file of files) {
      try {
        for (const entry of await readFitFiles(file)) {
          try {
            runs.push(parseRunFit(entry.bytes, "fit"));
          } catch (error) {
            if (error instanceof NotARunError) skipped++;
            else errors.push(`${entry.name}: ${error instanceof Error ? error.message : "błąd odczytu"}`);
          }
        }
      } catch {
        errors.push(`${file.name}: nie udało się otworzyć pliku`);
      }
    }
    const added = actions.addRuns(runs);
    return { added, found: runs.length, skipped, errors };
  })();
}

export function ImportFit({ title = "Wgraj pliki z zegarka" }: { title?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handle(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setBusy(true);
    const result = await importFitFiles(files);
    setBusy(false);
    if (result.added > 0) {
      toast.success(`Dodano ${result.added} ${result.added === 1 ? "bieg" : "biegów"}`, {
        description:
          result.skipped > 0 ? `Pominięto ${result.skipped} aktywności, które nie są biegami.` : undefined,
      });
    } else if (result.found > 0) {
      toast.info("Te biegi są już w aplikacji");
    } else if (result.skipped > 0) {
      toast.warning("W plikach nie było biegów");
    }
    result.errors.slice(0, 3).forEach((e) => toast.error(e));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Pliki .fit (lub .zip z Garmin Connect) są odczytywane wyłącznie w Twojej przeglądarce i nigdzie nie
          trafiają.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handle(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          {busy ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <FileUp className="size-6 text-muted-foreground" />}
          <p className="text-sm text-muted-foreground">Przeciągnij pliki tutaj lub wybierz z dysku</p>
          <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            Wybierz pliki .fit / .zip
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".fit,.zip,application/octet-stream,application/zip,application/x-zip-compressed"
            multiple
            hidden
            data-testid="fit-input"
            onChange={(e) => {
              if (e.target.files) void handle(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Skąd wziąć pliki FIT?</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
            <li>
              <strong>USB:</strong> podłącz Venu 2 Plus do komputera i skopiuj pliki z folderu{" "}
              <code className="font-mono text-xs">GARMIN/Activity</code>.
            </li>
            <li>
              <strong>Na telefonie</strong> wygodniejsza jest synchronizacja z Garmin Connect obok. Pliki FIT
              wgrasz stąd, jeśli masz je w pamięci telefonu.
            </li>
            <li>
              <strong>Garmin Connect (web):</strong> otwórz aktywność, ikona zębatki, „Eksportuj oryginał”. Pobierzesz
              archiwum .zip, które możesz wgrać bez rozpakowywania.
            </li>
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
