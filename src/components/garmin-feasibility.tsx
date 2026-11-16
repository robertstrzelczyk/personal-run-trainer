import { Check, Minus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "yes" | "partial" | "no";

const ROWS: Array<{ title: string; status: Status; detail: string }> = [
  {
    title: "Odczyt biegów z Venu 2 Plus",
    status: "yes",
    detail:
      "Pliki FIT z zegarka (USB lub eksport z Garmin Connect) albo oficjalny Personal API Garmina, który zwraca pliki FIT Twoich aktywności.",
  },
  {
    title: "VO2max i strefy tętna z Garmin",
    status: "yes",
    detail:
      "Personal API udostępnia dzienne VO2max oraz strefy tętna. Gdy ich nie ma, aplikacja szacuje VO2max z tętna i tempa Twoich biegów.",
  },
  {
    title: "Trening na dziś (jak na Forerunnerze lub Fenixie)",
    status: "yes",
    detail:
      "Zegarek nie ma tej funkcji, ale aplikacja liczy ją sama: z formy, zmęczenia, ostatnich treningów i Twojego celu. Metody Garmina (Firstbeat) są zamknięte, więc to rozwiązanie zastępcze, nie kopia.",
  },
  {
    title: "Efektywność biegu",
    status: "partial",
    detail:
      "Bez dodatkowego czujnika Venu 2 Plus nie zapisuje dynamiki biegu (czas kontaktu, oscylacja). Liczę metry na uderzenie serca, dryf tętna, kadencję i długość kroku.",
  },
  {
    title: "Wysyłanie treningów na zegarek",
    status: "partial",
    detail:
      "Personal API jest tylko do odczytu. Aplikacja generuje plik FIT treningu, który kopiujesz przez USB. Automatyczne wysyłanie (Training API) Garmin daje tylko firmom po akceptacji.",
  },
  {
    title: "Automatyczna synchronizacja w tle",
    status: "no",
    detail:
      "Klucz osobisty wygasa po 30 dniach do roku, a token po 24 godzinach, więc synchronizujesz na żądanie. Nieoficjalne logowanie hasłem do Garmin Connect celowo pomijam: łamie regulamin i często przestaje działać.",
  },
];

const STATUS = {
  yes: { label: "Tak", icon: Check, className: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Częściowo", icon: Minus, className: "bg-amber-100 text-amber-800" },
  no: { label: "Nie", icon: X, className: "bg-red-100 text-red-800" },
} as const;

export function GarminFeasibility() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Co jest możliwe z Garmin Venu 2 Plus</CardTitle>
        <CardDescription>Wynik sprawdzenia dokumentacji Garmina, na którym opiera się ta aplikacja.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {ROWS.map((row) => {
            const s = STATUS[row.status];
            const Icon = s.icon;
            return (
              <li key={row.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className={`mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium ${s.className}`}>
                  <Icon className="size-3" />
                  {s.label}
                </span>
                <div>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-sm text-muted-foreground">{row.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
