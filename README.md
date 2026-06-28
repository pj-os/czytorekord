# Czy to rekord? 🔥

Termiczna historia Polski w jednej aplikacji. Wpisz miasto (albo użyj lokalizacji) — apka sama pobiera aktualną temperaturę i porównuje ją z **80+ latami** danych pogodowych, żeby odpowiedzieć na pytanie: *czy dziś jest rekordowo gorąco?*

## Co pokazuje

- **Werdykt na żywo** — czy dzisiejsza temperatura to rekord dla tej daty, a jeśli nie, kiedy ostatnio było równie gorąco.
- **Paski Hawkinsa (warming stripes)** — ocieplenie miasta rok po roku.
- **Ten dzień w historii** — maks. temperatura tej daty w każdym roku od 1940.
- **Rankingi** — najcieplejsze miesiące, najcieplejsze lata, najwięcej dni upalnych (≥30°C) i nocy tropikalnych (≥20°C).

## Dane

[Open-Meteo](https://open-meteo.com) — reanaliza ERA5, dane dzienne od 1940 roku. Bez klucza API, bez backendu. Reverse-geocoding: BigDataCloud.

## Uruchomienie

```bash
npm install
npm run dev      # next dev → http://localhost:5180
npm run build    # next build
npm start        # produkcyjny serwer
npm run test:run # 51 testów (Vitest, w tym golden snapshoty)
```

## Trasy

- `/` — interaktywna aplikacja (client)
- `/[miasto]/[data]` — strony SSR pod SEO (np. `/warszawa/07-15`), per-stronę metadata/OG
- `/o-projekcie` — metodologia (SSR)
- `/sitemap.xml`, `/robots.txt` — generowane

## Wdrożenie (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpj-os%2Fczytorekord)

1. Zaimportuj repo `pj-os/czytorekord` w Vercelu — framework **Next.js** wykryje się automatycznie (zero konfiguracji, brak zmiennych środowiskowych).
2. Po deployu włącz **Analytics** w panelu projektu (zakładka *Analytics → Enable*) — `@vercel/analytics` jest już wpięte.
3. Domena produkcyjna: `czytorekord.vercel.app` (ustawiona w metadanych, sitemap, robots i grafice udostępniania). Przy własnej domenie podmień ją w `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts` oraz `SHARE_SITE` w `src/share.ts`.

Bez cookies i bez backendu — statystyki Vercela są anonimowe, więc baner zgody nie jest wymagany.

### Analityka zdarzeń (PostHog, darmowa)

Szczegółowe zdarzenia (które miasta sprawdzano, kliki „Udostępnij", pobrania obrazka) idą do **PostHog** — bo custom events Vercela wymagają planu Pro. Konfiguracja:

1. Załóż darmowy projekt na [eu.posthog.com](https://eu.posthog.com) (region **EU** pod RODO).
2. Skopiuj **Project API Key** i ustaw w Vercel → Settings → Environment Variables: `NEXT_PUBLIC_POSTHOG_KEY` (patrz `.env.example`).
3. Redeploy. Zdarzenia: `place_load`, `share_click`, `image_download`, `share_native/system`, `compare`, `shortcut`.

Bez ustawionego klucza apka działa normalnie — leci tylko darmowa analityka odsłon Vercela.

## Stack

Next.js 14 (App Router) + React + TypeScript + Framer Motion. Logika pogodowa
niezależna od frameworka (`src/`), pokryta testami. Wizualizacje na Canvas/SVG.
Strony miast renderowane po stronie serwera (SSR) dla SEO; interaktywny dashboard
po stronie klienta.
