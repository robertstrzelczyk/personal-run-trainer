# Trener biegowy (Expo) — Garmin Venu 2 Plus

Lokalna aplikacja Expo (bez logowania / konta) — personalny trener biegowy z danymi
z Garmin Connect przez **Personal API Key**. Dane zostają na urządzeniu (AsyncStorage +
SecureStore). Uzupełnia to, czego Venu 2 Plus nie pokazuje: formę, obciążenie, strefy HR,
statystyki z filtrem sportu, plan 7 dni / blok do startu, RPE, deload, pogodę i mapę trasy.

## Stack

- Expo Router + TypeScript
- Dane lokalne (brak Supabase / logowania) + backup/restore JSON
- Garmin Connect Personal API (odczyt; klucz w SecureStore)
- Eksport treningu: tekst (Share) + plik FIT
- Pogoda: Open-Meteo (bez klucza), po współrzędnych z GPS aktywności
- Vitest + Maestro + EAS Build (APK)

## Konfiguracja

1. Personal API Key: Garmin Connect (www) → Ustawienia → Personal API Key.
2. W aplikacji wklejasz klucz w **Ustawienia** (lub w onboardingu) — SecureStore.
3. Sync pobiera biegi, chodzenie i kolarstwo (FIT + uproszczony GPS), VO2 i HR.
   Zakres: **90 dni / 1 rok / cała historia** (~10 lat wstecz). Lista aktywności jest
   cięta na okna 28 dni (Garmin search pada przy zbyt wielu wynikach w jednym zakresie).

## Uruchomienie

```bash
npm install
npx expo start
npm test
```

## Maestro (E2E)

Flowy w `.maestro/` (`appId: pl.biegowytrener.app`). Wymagają **zbudowanego APK** (nie Expo Go) + emulatora Android (API 31–34).

```bash
# 1) CLI Maestro (Windows — Maestro Studio albo instalator z docs.maestro.dev)
# 2) APK E2E
npx eas-cli@latest build -p android --profile e2e-test
# zainstaluj APK na emulatorze, potem:

npm run test:e2e:smoke   # launch + taby + Biegi
npm run test:e2e         # cały katalog .maestro

# albo w chmurze EAS:
npx eas-cli@latest workflow:run .eas/workflows/e2e-test-android.yml
```

Po `clearState` każdy flow przechodzi onboarding (`shared/skip-onboarding.yaml`) i wchodzi na **Dziś** bez syncu Garmin.

## Zakładki

- **Dziś** — trening dziś/jutro, plan 7 dni, plan vs wykonanie, pogoda, deload, skrót planu blokowego
- **Forma** — CTL/ATL/TSB, VO2/VDOT, efektywność
- **Biegi** — lista + badge zgodności z planem dnia + RPE
- **Statystyki** — tydzień / miesiąc / rok × filtr: wszystkie / bieg / chód / rower
- **Ustawienia** — Garmin, profil, deload, backup JSON, link do startów i planu blokowego

Ekrany: trening (`/workout/[when]` — share/FIT), aktywność (`/run/[id]` — RPE, mapa), starty (`/races`), plan blokowy (`/plan`), onboarding (`/onboarding`).

## Coaching (v1.2)

- Rekomendacja dziś/jutro (TRIMP, limity dni, rotacja jakości, cel czasowy startu).
- Kalendarz startów z fazami Budowa → Peak → Taper → start → regeneracja.
- Plan 7 dni + **plan blokowy** 8–16 tyg. do aktywnego startu.
- Plan vs wykonanie (lista Biegi + karta Dziś) — **wpływa na kolejne sugestie** (bez osobnego ręcznego planu): skip jakości / za ciężki easy → mniej jakości i objętości.
- RPE 1–5 po aktywności; wysokie średnie RPE → lżejszy dzień.
- Deload (3/7 dni) w Ustawieniach.
- Eksport tekst / FIT; kopia zapasowa JSON.

## Ograniczenia

- Personal API read-only; sync na żądanie / auto-sync.
- Forma = model TRIMP, nie oficjalny Firstbeat.
- Mapa i pogoda wymagają GPS w FIT (po ponownym syncu nowych aktywności).
- Brak push workoutów bezpośrednio do Garmin Connect (eksport FIT lokalnie).
