# Trener biegowy (Expo) — Garmin Venu 2 Plus

Natywna aplikacja Android (Expo) z kontem użytkownika, bazą Supabase i synchronizacją
treningów z Garmin Connect przez **Personal API Key**. Uzupełnia brak analizy treningowej
na Venu 2 Plus (forma, obciążenie, VO2/VDOT, trening na dziś).

## Stack

- Expo Router + TypeScript
- Supabase Auth (e-mail/hasło) + Postgres (RLS)
- Garmin Connect Personal API (tylko odczyt; bez logowania hasłem do Connect)
- EAS Build → APK (`preview`)

## Konfiguracja

1. Utwórz projekt w [Supabase](https://supabase.com) i w SQL Editor uruchom
   [`supabase/schema.sql`](supabase/schema.sql).
2. W Auth włącz e-mail/password.
3. Skopiuj `.env.example` → `.env` i uzupełnij:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Personal API Key tworzysz w Garmin Connect (strona www, Ustawienia → Personal API Key).
   W aplikacji wklejasz go w **Ustawienia** — klucz trafia do SecureStore na telefonie.

## Uruchomienie (dev)

```bash
npm install
npx expo start
```

## APK (EAS, konto robek137s-team)

Projekt: https://expo.dev/accounts/robek137s-team/projects/personal-run-trainer

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Profil `preview` w `eas.json` buduje **APK**. Po zakończeniu pobierzesz go ze strony builda
w Expo i zainstalujesz na telefonie (instalacja z nieznanych źródeł).

Zmienne Supabase dodaj też w EAS (Environment → preview), jeśli chcesz je w buildzie produkcyjnym:
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Zakładki

- **Dziś** — rekomendowany trening
- **Forma** — CTL/ATL/TSB, VO2/VDOT, efektywność
- **Biegi** — lista zsynchronizowanych aktywności
- **Ustawienia** — konto, klucz Garmin, sync, profil

## Ograniczenia

- Personal API jest read-only i do użytku osobistego; sync na żądanie.
- Status formy / efekt to nasz model (TRIMP), nie oficjalny Firstbeat z zegarka.
- Hasło Garmin Connect nie jest używane (regulamin / ryzyko blokady konta).
