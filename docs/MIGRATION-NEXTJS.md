# Plan migracji na Next.js (do wykonania interaktywnie)

> Status: **plan gotowy, niewykonany.** Migracja jest destrukcyjna i konfliktuje z
> obecnym setupem Vite — wykonać razem (ja realizuję, Ty obecny do iteracji),
> bo `next build` może wymagać kilku rund poprawek, a discipline pętli to
> „bramki zielone". Cała logika (Faza 0–3 poniżej migracji) jest niezależna od
> frameworka i przetrwa migrację bez zmian — 51 testów dalej chroni.

## Dlaczego nie zrobiłem tego w pętli
- **Konflikt build-systemów**: Vite (`tsc -b`, `index.html`, `main.tsx`) i Next
  (App Router, RSC, własny `tsconfig` z pluginem `next`) walczą o ten sam
  `tsconfig.json`. Współistnienie = konflikty; migracja = realne zastąpienie.
- **SSG vs limit API**: budowanie statycznych stron miast pobierałoby archiwum
  Open-Meteo w trakcie `next build` → 429 wywala build. Strony miast muszą być
  **SSR na żądanie** (`dynamic = 'force-dynamic'`) albo ISR z cache.
- Wykonanie na ślepo, bez nadzoru, grozi zostawieniem czerwonego repo.

## Co reużywamy bez zmian (framework-agnostic)
`src/compute.ts`, `api.ts`, `load.ts`, `url.ts`, `calendar.ts`, `palette.ts`,
`format.ts`, `share.ts`, `analytics.ts`, `alerts.ts`, `types.ts` + wszystkie testy.

## Docelowa struktura (App Router)
```
app/
  layout.tsx            # server; <html lang=pl>, metadata bazowe, JSON-LD, manifest, fonty
  ClientInit.tsx        # 'use client'; rejestracja SW + configureAnalytics (process.env.NODE_ENV)
  page.tsx              # server; renderuje <AppClient/> (interaktywny dashboard)
  AppClient.tsx         # 'use client'; obecny App.tsx (geolokacja, canvas, framer, fetch)
  o-projekcie/page.tsx  # server; treść z AboutModal jako realna strona (SEO)
  [miasto]/
    [data]/page.tsx     # server, SSR; generateMetadata (per-stronę OG) + SEO HTML
  sitemap.ts            # generowany z PRESET_CITIES + kluczowych dat
  robots.ts             # zamiast public/robots.txt
```

## Kluczowe punkty
1. **`'use client'`** na całym interaktywnym dashboardzie (to jeden duży komponent klienta).
2. **Strony `/[miasto]/[data]`** = server components:
   - slug miasta → współrzędne z `PRESET_CITIES` (rozszerzyć o słownik slugów);
   - `fetch` archiwum **server-side** (`export const dynamic = 'force-dynamic'` lub `revalidate`);
   - render realnego HTML: `<h1>`, werdykt (z `buildVerdict`), rekord, tabela „ten dzień w historii”;
   - `generateMetadata()` → per-stronę `<title>`, `description`, `og:image` (dynamiczny przez `opengraph-image.tsx` reużywając `buildShareImage`).
3. **`tsconfig.json`** → wariant Next (`jsx: preserve`, `plugin next`, `moduleResolution: bundler`, `incremental`, include `.next/types`). Usuwamy `tsc -b` z `build`.
4. **Skrypty**: `dev: next dev`, `build: next build`, `start: next start`. Vitest bez zmian.
5. **Hosting**: `vercel.json`/`netlify.toml` → konfiguracja pod Next (Vercel natywnie; Netlify z adapterem). Obecne pliki SPA do usunięcia.
6. **Usuwamy**: `index.html`, `src/main.tsx`, `vite.config.ts`, zależność `vite` + `@vitejs/plugin-react` (po potwierdzeniu, że Next działa).
7. **OG dynamiczne**: `app/[miasto]/[data]/opengraph-image.tsx` renderuje obraz werdyktu po stronie serwera (ImageResponse) — prawdziwy podgląd linku na FB/X.

## Kolejność wykonania (każdy krok = `next build` zielony)
1. `npm i next` + `next.config.mjs` + tsconfig Next + skrypty.
2. `app/layout.tsx` + `app/page.tsx` + `AppClient.tsx` (przeniesiony App) → `next build` zielony, parytet z obecnym SPA.
3. `o-projekcie/page.tsx` (treść z AboutModal).
4. `[miasto]/[data]/page.tsx` SSR + `generateMetadata`.
5. `opengraph-image.tsx` (dynamiczny OG).
6. `sitemap.ts` + `robots.ts` (z PRESET_CITIES).
7. Sprzątanie Vite + aktualizacja hostingu + smoke wszystkich tras.

Szacunek: kilka rund iteracji `next build`. Najlepiej zrobić to w jednej wspólnej sesji.
