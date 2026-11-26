This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Agenci Cursor (subagenci)

W `.cursor/agents/` — wywołaj `/nazwa` albo „użyj agenta …”:

| Agent | Rola |
|-------|------|
| `/analiza` | Wymagania, wpływ, plan — bez kodu (`readonly`) |
| `/development` | Implementacja feature/bug + branch MPT |
| `/code-review` | Review diff/PR przed merge (`readonly`) |
| `/test` | `npm test` / typecheck / smoke → To Test → Done |

Flow karty: **analiza → development → code-review → test**.

## Git & Trello — branche i wydania

Tablica: [My Personal Trainer](https://trello.com/b/lmVB3mWO/my-personal-trainer)

### Numery tasków (`MPT-<n>`)

- Każda karta ma **numer z Trello** (widać w URL karty: `trello.com/c/.../<n>-...` oraz w tytule jako prefiks `MPT-<n>:`).
- Ten numer idzie do **nazwy brancha** i **tytułu / opisu PR**.
- Etykiety na karcie (obowiązkowo jedna z dwóch):
  - **feature** (zielona) — nowa funkcjonalność
  - **bug** (czerwona) — poprawka błędu

### Model branchy

| Branch | Rola |
|--------|------|
| `develop` | Integracja — **wszystkie PR-y tasków** trafiają tu |
| `master` | Wydania — po zatwierdzeniu: merge `develop` → `master`, potem build APK (EAS/Expo) |
| branch taska | Jedna karta = jeden branch od `develop` |

**Nazwa brancha (obowiązkowy wzorzec):**

| Etykieta | Branch |
|----------|--------|
| feature | `feat/MPT-<n>-<krotki-slug>` |
| bug | `fix/MPT-<n>-<krotki-slug>` |

Przykłady: `feat/MPT-3-maestro-smoke`, `fix/MPT-5-code-review-perf`.

**Tytuł PR:** `MPT-<n>: <krótki opis>` (to samo `<n>` co na karcie i w branchu).

- **Nie commituj** bezpośrednio na `develop` ani `master` (poza merge / release).
- Stary `main` może istnieć historycznie; baza pracy to **`develop`**, wydania z **`master`**.

### Jeden task = jeden branch

1. Weź kartę z **TO DO** / **In Progress**. Skopiuj szablon `[SZABLON] Task`. Nadaj tytuł `MPT-<n>: …`, dodaj etykietę **feature** lub **bug**.
2. Branch od **`develop`** wg wzorca powyżej (ASCII slug, bez spacji).
3. Na starcie: karta → **In Progress**; w opisie uzupełnij **Branch** / **MPT** / **PR target: develop**.
4. Po kodzie: `npm test` + `npm run typecheck` (+ lint jeśli dotyczy), push, **PR do `develop`** z tytułem `MPT-<n>: …` → karta **Code Review** + link PR.
5. Po merge do `develop`: **To Test** → **In Testing** → **Done**; zanotuj wynik testów.
6. Agent bez PR: zostaw w karcie opis PR i dokładną nazwę brancha; **nie** pushuj na `develop`/`master`.

### Release (APK)

1. Zatwierdzenie wydania (review / checklista).
2. PR lub merge: **`develop` → `master`** (tylko wtedy).
3. Build APK z `master` (`eas build` / profil preview lub production).
4. Oznacz tag/wersję na `master` jeśli dotyczy (`vX.Y.Z`).
