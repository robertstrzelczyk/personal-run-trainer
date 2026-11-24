# Trener biegowy (Expo) — Garmin Venu 2 Plus

Lokalna aplikacja Expo (bez logowania / konta) — personalny trener biegowy z danymi
z Garmin Connect przez **Personal API Key**. Dane zostają na urządzeniu (AsyncStorage +
SecureStore). Uzupełnia to, czego Venu 2 Plus nie pokazuje: formę, obciążenie, strefy HR,
statystyki, plan na 7 dni, porównanie plan vs wykonanie oraz trening na dziś/jutro
(z eksportem FIT / udostępnieniem tekstu).

## Stack

- Expo Router + TypeScript
- Dane lokalne (brak Supabase / logowania)
- Garmin Connect Personal API (odczyt; klucz w SecureStore)
- Eksport treningu: tekst (Share) + plik FIT (`expo-sharing` / `expo-file-system`)
- Vitest (unit testy analytics / coach / sync)
- Maestro (testy E2E na emulatorze / urządzeniu)
- EAS Build → APK (`preview` / `e2e-test`)

## Konfiguracja

1. Personal API Key: Garmin Connect (www) → Ustawienia → Personal API Key.
2. W aplikacji wklejasz klucz w **Ustawienia** — trafia do SecureStore na telefonie.
3. Sync pobiera biegi, chodzenie i kolarstwo (FIT), VO2 i ustawienia HR.

Nie potrzebujesz pliku `.env` do podstawowego działania.

## Uruchomienie (dev)

```bash
npm install
npx expo start
```

Testy jednostkowe:

```bash
npm test
```

### Testy E2E (Maestro)

Wymagania: [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro), emulator lub telefon z zainstalowaną aplikacją (`pl.biegowytrener.app`).

1. Zbuduj APK pod E2E (lub użyj istniejącego preview):

```bash
npm run eas:e2e:apk
```

2. Zainstaluj APK na emulatorze / urządzeniu, potem:

```bash
npm run test:e2e          # wszystkie flowy w .maestro/
npm run test:e2e:smoke    # tylko smoke (launch + nawigacja zakładek)
```

Flowy:

| Plik | Co sprawdza |
|------|-------------|
| `launch.yaml` | Start aplikacji, pusty stan „Witaj” |
| `tabs-navigation.yaml` | Przełączanie Dziś → Forma → Biegi → Statystyki → Ustawienia |
| `fitness-empty.yaml` | Ekran formy bez biegów |
| `stats-periods.yaml` | Filtry Tydzień / Miesiąc / Rok |
| `settings-garmin.yaml` | Walidacja klucza API i sync bez klucza |
| `settings-profile.yaml` | Edycja i zapis profilu treningowego |

Na CI (EAS Workflows):

```bash
eas workflow:run .eas/workflows/e2e-test-android.yml
```

## APK (EAS)

Projekt: https://expo.dev/accounts/robek137s-team/projects/personal-run-trainer

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Profil `preview` buduje **APK** do instalacji z nieznanych źródeł.

## Zakładki

- **Dziś** — trening na dziś/jutro, plan 7 dni, plan vs wykonanie, skrót formy i startów
- **Forma** — CTL/ATL/TSB, VO2/VDOT, efektywność
- **Biegi** — lista aktywności + szczegóły biegu (strefy HR)
- **Statystyki** — bieg / marsz / rower × tydzień / miesiąc / rok
- **Ustawienia** — klucz Garmin, sync, profil, auto-sync

Ekrany szczegółów: trening (`/workout/[when]` — udostępnij tekst / eksport FIT), aktywność (`/run/[id]`), starty (`/races`).

## Coaching

- Rekomendacja na dziś i jutro (obciążenie TRIMP, limity dni/tydzień, rotacja jakości).
- **Kalendarz startów** — faza Budowa → Peak → Taper → start → regeneracja; jeden aktywny start „Przygotuj mnie”.
- **Cel czasowy startu** — ocena łatwy / realistyczny / ambitny względem VDOT; wpływa na rationale i rotację akcentów w fazie build/peak.
- **Plan na 7 dni** — podgląd typów treningów i sumy km vs cel dni/tydzień.
- **Plan vs wykonanie** — status: zgodny / za ciężki / za lekki / pominięty / odpoczynek OK.
- **Eksport** — tekst treningu lub plik FIT do skopiowania na zegarek.

## Ograniczenia

- Personal API jest read-only i do użytku osobistego; sync na żądanie (lub auto-sync).
- Status formy / efekt to nasz model (TRIMP), nie oficjalny Firstbeat z zegarka.
- Hasło Garmin Connect nie jest używane (regulamin / ryzyko blokady konta).
- FIT eksportujemy lokalnie (share); nie ma push workoutów bezpośrednio do Garmin Connect.
