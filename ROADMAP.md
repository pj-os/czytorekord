# Roadmap — Czy to rekord?

Autonomiczna pętla: każda pozycja przechodzi bramki **tsc → vitest/golden → build → smoke** zanim uznana za zrobioną.

## Bramki jakości (stan: 🟢 zielone)
- `npm run build` — `next build` (typecheck + 6 tras, SSR/SSG)
- `npm run test:run` — 51 testów, w tym 7 golden snapshotów
- smoke w przeglądarce (preview) dla zmian widocznych w UI

---

## Faza 0 — Harness self-walidacji ✅
- [x] Vitest + konfiguracja (`vitest.config.ts`, skrypty `test` / `test:run`)
- [x] Zamrożone fixtury danych (Warszawa, Zakopane — 1940–2025, bez sieci)
- [x] Golden testy logiki: `buildVerdict`, `daySnapshot`, `yearStats`, `monthStats`
- [x] Testy jednostkowe: `format` (pluralizacja PL), `calendar`, `palette`
- [x] Inwarianty: rankingi spójne, monotoniczność percentyla, rekordy ciepło/zimno

## Faza 1 — Warstwa kodu (auto-testowalna)
- [x] **Permalinki** — stan (miasto + data) w URL; share/SEO prowadzą do konkretnego widoku; share zawiera link
- [x] Skróty na suwaku — skok do najgorętszego / najzimniejszego dnia w historii
- [x] „Twój wiek w upałach" — personalizacja (rok urodzenia → dni upalne w życiu)
- [x] Porównanie dwóch miast obok siebie (deklinacja-bezpieczny opis, fetch drugiego miasta + obsługa błędu)
- [x] Dostępność (a11y): focus-visible, aria-label/aria-live, reduced-motion (MotionConfig + CSS + count-up)
- [x] PWA shell (manifest + service worker + ikony, „dodaj do ekranu", network-first SW)
- [x] Bazowe meta + OG + opis (statyczny shell; per-stronę OG w Fazie 3)
- [x] Golden/komponentowe testy dla nowych funkcji (na bieżąco — 39 testów)

## Faza 2 — Szkielety integracji (kod + mocki; wymagają później Twoich kluczy)
- [x] Analytics (warstwa zdarzeń, provider-agnostic, gating zgody RODO; dev=console, prod czeka na providera) — podpięte: place_load, share, compare, shortcut
- [x] Zapis na alert rekordu (e-mail) — UI + walidacja + kontrakt `AlertSink` + mock localStorage; podpięte analytics
  - ⏸ **ukryty w UI** (panel wyłączony z `App.tsx`); kod `AlertSignup`/`alerts.ts` + testy zostają. Włączyć po realnym backendzie + polityce prywatności.
- [x] Konfiguracja hostingu (vercel.json + netlify.toml: SPA fallback, cache immutable dla /assets, no-cache dla sw.js/HTML, nagłówki bezpieczeństwa) — do rewizji po Next.js

## Faza 3 — Next.js / SEO (migracja, siatka bezpieczeństwa = testy z Fazy 0)
> ✅ Migracja wykonana — Next.js 14 App Router. `next build` zielony (6 tras), 51 testów dalej zielonych.
- [x] Migracja na Next.js (App Router) — `app/` (layout, page→AppClient, ClientInit), Vite usunięty, skrypty next
- [x] SSR + meta OG/Twitter per strona (`generateMetadata` na `/[miasto]/[data]`, OG/Twitter w layout)
- [x] Strony programowe: `/[miasto]/[data]` (SSR `force-dynamic` — nie SSG, by nie bić w limit API podczas builda)
- [x] `app/sitemap.ts` + `app/robots.ts` (generowane z PRESET_CITIES × daty sezonowe)
- [x] Strona „O projekcie" + „Metodologia / Skąd dane" (E-E-A-T) — modal w SPA; staje się stroną SSR po migracji
- [x] robots.txt + sitemap.xml (homepage; pełny po Next.js) + structured data JSON-LD (WebApplication) — ⚠ ustaw realną domenę

## 🧠 Wymaga decyzji / kont Twoich (poza pętlą)
- Licencja Open-Meteo do użytku komercyjnego (reklamy/afiliacja)
- Wybór modelu monetyzacji (afiliacja / display / B2B / lead-gen)
- Treści SEO, brand copy, baner zgody RODO
- Klucze: analytics, provider e-mail/push, konto hostingu, konta afiliacyjne/social
- ~~Realna domena~~ ✅ ustawiona na `czytorekord.vercel.app` (layout metadataBase + JSON-LD, sitemap, robots, grafika share)
