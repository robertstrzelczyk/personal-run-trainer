# Trener biegowy dla Garmin Venu 2 Plus

Osobisty trener biegania dla zegarków, które nie mają funkcji „Trening na dziś”
(Venu 2 Plus, w odróżnieniu od Forerunnerów i Fenixów). Aplikacja czyta Twoje
biegi z Garmina i na ich podstawie pokazuje:

- **Stopień wytrenowania**: VO2max (z Garmin Connect albo oszacowany z tętna i
  tempa), poziom względem wieku i płci, prognozy na 5 km, 10 km, półmaraton i
  maraton, tempa treningowe (VDOT wg Danielsa).
- **Formę i obciążenie**: TRIMP, forma (CTL), zmęczenie (ATL), świeżość (TSB),
  stosunek obciążeń 7/28 dni, kilometry tygodniowo.
- **Efektywność biegu**: metry na uderzenie serca z trendem, dryf tętna (Pa:HR),
  kadencja, długość kroku.
- **Trening na dziś**: dobrany do formy, ostatnich treningów, celu (ogólna
  sprawność, 5 km, 10 km, półmaraton, maraton) i liczby dni biegowych. Każdy
  trening ma kroki z tempami i zakresami tętna, uzasadnienie oraz plik `.fit`
  do wgrania na zegarek.

Dane są przechowywane wyłącznie lokalnie na urządzeniu (`localStorage`). Nie ma konta ani
bazy danych.

## Co jest możliwe z Venu 2 Plus (wynik sprawdzenia)

| Funkcja | Status | Jak |
| --- | --- | --- |
| Odczyt biegów | Tak | Pliki FIT (USB, eksport z Garmin Connect) lub oficjalny **Garmin Connect Personal API** (klucz tworzysz w Garmin Connect, Ustawienia, Personal API Key) |
| VO2max i strefy tętna z Garmin | Tak | Personal API: `metrics-service/metrics/maxmet/daily`, `biometric-service/heartRateZones/v2` |
| Trening na dziś | Tak (w aplikacji) | Venu 2 Plus nie ma tej funkcji, więc liczy ją aplikacja |
| Efektywność biegu | Częściowo | Bez dodatkowego czujnika brak dynamiki biegu, więc liczymy z tętna, tempa i kadencji |
| Wysyłanie treningów na zegarek | Częściowo | Personal API jest tylko do odczytu, Training API jest dla firm. Aplikacja generuje plik FIT treningu do skopiowania przez USB (`GARMIN/NewFiles`) oraz opis do odtworzenia w Garmin Connect |
| Synchronizacja w tle | Nie | Klucz osobisty wygasa (30 dni do roku), token po 24 h, synchronizacja jest na żądanie |

Nieoficjalnych bibliotek logujących się hasłem do Garmin Connect celowo nie używam.

## Aplikacja mobilna (Android i iOS)

Aplikacja jest opakowana w [Capacitor](https://capacitorjs.com): ten sam interfejs
działa jako natywna aplikacja z własną ikoną, ekranem startowym i obsługą
wcięć ekranu (notch, pasek gestów). Projekty natywne są w `android/` i `ios/`.

W wersji mobilnej nie ma serwera. Telefon sam rozmawia z Garmin Connect
(natywny klient HTTP, bez CORS), więc klucz Personal API nie opuszcza urządzenia,
a biegi są analizowane lokalnie. Dane leżą w pamięci aplikacji. Plik `.fit`
treningu otwiera systemowe okno udostępniania (zapis do Plików, wysyłka na
komputer, AirDrop, Nearby Share).

- Klucz Personal API tworzysz w przeglądarce na connect.garmin.com
  (Ustawienia, Personal API Key; na telefonie włącz „Wersję na komputer”),
  kopiujesz go i wklejasz w karcie „Dane”.
- Trening na dziś przenosisz na zegarek z aplikacji Garmin Connect według
  skopiowanego opisu. Plik `.fit` jest przydatny przy kopiowaniu przez USB.

### Android

Wymagania: Node 22+, JDK 21, Android SDK (platforma 36). Najprościej zainstalować
Android Studio.

```bash
npm install
npm run android:debug     # buduje web, synchronizuje i składa APK
# android/app/build/outputs/apk/debug/app-debug.apk
```

APK wgrasz na telefon (włącz instalację z nieznanych źródeł) albo przez
`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`. Do
Google Play potrzebny jest podpisany pakiet: Android Studio, Build, Generate
Signed Bundle.

### iOS

Budowanie na iOS wymaga komputera Mac z Xcode i konta Apple Developer
(darmowe wystarcza do instalacji na własnym telefonie na 7 dni). Projekt używa
Swift Package Managera, więc CocoaPods nie jest potrzebny.

```bash
npm install
npm run cap:sync          # buduje web i synchronizuje z ios/ i android/
npx cap open ios          # otwiera Xcode: wybierz zespół (Signing) i uruchom
```

### Po zmianach w kodzie

```bash
npm run cap:sync          # przebudowuje statyczny eksport (out/) i kopiuje do natywnych projektów
```

Budowanie mobilne (`scripts/build-mobile.mjs`) robi statyczny eksport Next.js i na
czas budowania odsuwa trasy serwerowe (`src/app/api`, ikony i manifest PWA), których
aplikacja natywna nie używa. Wersja webowa (`npm run dev`, `npm run build`) działa
jak dotąd i nadal jest PWA do instalacji z Chrome.

## Uruchomienie

```bash
npm install
npm run dev        # http://localhost:4717
```

Inne polecenia:

```bash
npm test           # testy jednostkowe (FIT, analityka, trener)
npm run typecheck
npm run lint
npm run build && npm start
```

### Synchronizacja z Garmin Connect

1. W Garmin Connect (strona www) otwórz Ustawienia, Personal API Key, Utwórz klucz.
2. W aplikacji wklej klucz w karcie „Synchronizacja z Garmin Connect”.

Klucz trafia do serwera Next.js tylko na czas synchronizacji (żeby wymienić go na
token i pobrać dane, bo API Garmina nie jest dostępne z przeglądarki). Nie jest
zapisywany ani logowany. Zgodnie z warunkami Garmina klucz jest do użytku
osobistego, więc nie udostępniaj tej aplikacji innym osobom jako usługi.

### Test bez konta Garmin

Atrapa Personal API generuje syntetyczne pliki FIT:

```bash
npm run mock:garmin    # http://127.0.0.1:4719, klucz API wypisany w konsoli
GARMIN_PERSONAL_API_BASE_URL=http://127.0.0.1:4719 npm run dev
```

Przycisk „Zobacz na przykładowych danych” na ekranie startowym ładuje 12 tygodni
danych demo bez żadnej konfiguracji.

## Jak działa trener

`src/lib/coach/recommend.ts` wybiera trening regułami:

1. Mało danych lub długa przerwa: łagodny rozruch lub powrót.
2. Przeciążenie (świeżość poniżej −30 albo stosunek obciążeń 7/28 dni powyżej 1,6)
   albo wykonany tygodniowy plan: dzień odpoczynku.
3. Po mocnym lub długim treningu: bieg regeneracyjny.
4. Długi bieg, gdy minął ponad tydzień (tempo spokojne, 8% dłużej niż poprzedni).
5. Akcent jakościowy (tempo, interwały, fartlek, szybkość, progresja, tempo
   maratońskie), gdy od ostatniego minęły 3 dni i forma pozwala. Rodzaj wynika
   z celu i rotacji.
6. W pozostałych przypadkach spokojny bieg aerobowy.

To heurystyki oparte na publicznych metodach (VDOT Danielsa, TRIMP Banistera,
ACSM), nie algorytmy Garmina (Firstbeat). Nie zastępują porady lekarza ani
trenera.

## Struktura

- `src/lib/fit`: odczyt biegów z FIT (`@garmin/fitsdk`), kodowanie treningów FIT,
  generator syntetycznych aktywności do testów.
- `src/lib/analytics`: fizjologia, obciążenie, poziom, efektywność.
- `src/lib/coach`: reguły doboru i budowniczowie treningów.
- `src/lib/garmin` i `src/app/api/garmin`: klient Personal API (`http.ts` wybiera
  natywny HTTP w aplikacji albo fetch), usługi współdzielone przez trasy proxy
  w wersji webowej i przez aplikację mobilną.
- `android/`, `ios/`, `capacitor.config.ts`, `assets/`: projekty natywne, ikony i ekran startowy.
- `src/components`: interfejs (Next.js, Tailwind, shadcn/ui, recharts).
