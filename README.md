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

## Stack

Next.js 14 (App Router) + React + TypeScript + Framer Motion. Logika pogodowa
niezależna od frameworka (`src/`), pokryta testami. Wizualizacje na Canvas/SVG.
Strony miast renderowane po stronie serwera (SSR) dla SEO; interaktywny dashboard
po stronie klienta.
