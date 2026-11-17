# Trener biegowy (Expo) — Garmin Venu 2 Plus

Lokalna aplikacja Expo (bez logowania / konta) — personalny trener biegowy z danymi
z Garmin Connect przez **Personal API Key**. Dane zostają na urządzeniu (AsyncStorage +
SecureStore). Uzupełnia to, czego Venu 2 Plus nie pokazuje: formę, obciążenie, strefy HR,
statystyki i trening na dziś/jutro.

## Stack

- Expo Router + TypeScript
- Dane lokalne (brak Supabase / logowania)
- Garmin Connect Personal API (odczyt; klucz w SecureStore)
- Vitest (unit testy analytics / coach / sync)
- EAS Build → APK (`preview`)

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

Testy:

```bash
npm test
```

## APK (EAS)

Projekt: https://expo.dev/accounts/robek137s-team/projects/personal-run-trainer

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Profil `preview` buduje **APK** do instalacji z nieznanych źródeł.

## Zakładki

- **Dziś** — trening na dziś/jutro, skrót formy
- **Forma** — CTL/ATL/TSB, VO2/VDOT, efektywność
- **Biegi** — lista aktywności + szczegóły biegu (strefy HR)
- **Statystyki** — bieg / marsz / rower × tydzień / miesiąc / rok
- **Ustawienia** — klucz Garmin, sync, profil, auto-sync

Ekrany szczegółów: trening (`/workout/[when]`), aktywność (`/run/[id]`).

## Ograniczenia

- Personal API jest read-only i do użytku osobistego; sync na żądanie (lub auto-sync).
- Status formy / efekt to nasz model (TRIMP), nie oficjalny Firstbeat z zegarka.
- Hasło Garmin Connect nie jest używane (regulamin / ryzyko blokady konta).
