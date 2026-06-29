// Regeneruje public/data/city-records.json — rekord maks. temperatury każdego
// dnia kalendarzowego dla śledzonych miejscowości (z gorącymi punktami jak Słubice).
//
// Uruchom z katalogu projektu:  node scripts/gen-city-records.mjs
// Dane: Open-Meteo (reanaliza ERA5), od 1940. Rekordy zmieniają się rzadko —
// wystarczy odświeżać raz na sezon.
//
// Lista MUSI odpowiadać POLAND_SPOTS w src/api.ts.

import { writeFileSync, statSync } from 'node:fs'

const cities = [
  ['warszawa', 'Warszawa', 52.2298, 21.0118], ['krakow', 'Kraków', 50.0614, 19.9372],
  ['lodz', 'Łódź', 51.7592, 19.456], ['wroclaw', 'Wrocław', 51.1079, 17.0385],
  ['poznan', 'Poznań', 52.4064, 16.9252], ['gdansk', 'Gdańsk', 54.352, 18.6466],
  ['szczecin', 'Szczecin', 53.4285, 14.5528], ['lublin', 'Lublin', 51.2465, 22.5684],
  ['katowice', 'Katowice', 50.2649, 19.0238], ['bialystok', 'Białystok', 53.1325, 23.1688],
  ['rzeszow', 'Rzeszów', 50.0413, 21.999], ['zakopane', 'Zakopane', 49.299, 19.9496],
  ['slubice', 'Słubice', 52.3508, 14.5601], ['kostrzyn', 'Kostrzyn n. Odrą', 52.5896, 14.6486],
  ['gorzow', 'Gorzów Wlkp.', 52.7368, 15.2288], ['zielona-gora', 'Zielona Góra', 51.9356, 15.5062],
  ['legnica', 'Legnica', 51.207, 16.1619], ['glogow', 'Głogów', 51.664, 16.0844],
  ['opole', 'Opole', 50.6751, 17.9213], ['tarnow', 'Tarnów', 50.0121, 20.9858],
  ['sandomierz', 'Sandomierz', 50.6829, 21.7497], ['kielce', 'Kielce', 50.8661, 20.6286],
  ['czestochowa', 'Częstochowa', 50.8118, 19.1203], ['kalisz', 'Kalisz', 51.7611, 18.0911],
  ['torun', 'Toruń', 53.0138, 18.5984], ['bydgoszcz', 'Bydgoszcz', 53.1235, 18.0084],
  ['plock', 'Płock', 52.5463, 19.7065], ['radom', 'Radom', 51.4027, 21.1471],
  ['olsztyn', 'Olsztyn', 53.7799, 20.4942], ['suwalki', 'Suwałki', 54.1115, 22.9309],
]

const pad = (n) => String(n).padStart(2, '0')
const now = new Date()
const end = new Date(now.getTime() - 2 * 86400000)
const endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchCity(lat, lon) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=1940-01-01&end_date=${endDate}&daily=temperature_2m_max&timezone=auto`
  for (let a = 0; a < 12; a++) {
    try {
      const r = await fetch(url)
      if (r.ok) return r.json()
    } catch {
      /* network hiccup — retry */
    }
    await sleep(8000)
  }
  throw new Error('fetch failed for ' + lat + ',' + lon)
}

const cityNames = {}
const perCity = {}
for (const [slug, name, lat, lon] of cities) {
  cityNames[slug] = name
  const d = await fetchCity(lat, lon)
  const T = d.daily.time
  const MX = d.daily.temperature_2m_max
  const m = {}
  for (let i = 0; i < T.length; i++) {
    const v = MX[i]
    if (v == null) continue
    const md = T[i].slice(5)
    const y = +T[i].slice(0, 4)
    if (!m[md] || v > m[md].t) m[md] = { t: v, y }
  }
  perCity[slug] = m
  process.stdout.write(`.${slug}`)
  await sleep(2000)
}

const byDay = {}
for (const md of Object.keys(perCity['warszawa'])) {
  const arr = []
  for (const slug of Object.keys(perCity)) {
    const e = perCity[slug][md]
    if (e) arr.push({ c: slug, t: Math.round(e.t * 10) / 10, y: e.y })
  }
  arr.sort((a, b) => b.t - a.t)
  byDay[md] = arr
}

writeFileSync('public/data/city-records.json', JSON.stringify({ cities: cityNames, byDay }))
const bytes = statSync('public/data/city-records.json').size
let abs = { t: -99 }
for (const md of Object.keys(byDay)) {
  const top = byDay[md][0]
  if (top && top.t > abs.t) abs = { ...top, md }
}
console.log(`\nSUCCESS spots=${cities.length} bytes=${bytes} | ABS: ${cityNames[abs.c]} ${abs.t}°C ${abs.md}/${abs.y}`)
