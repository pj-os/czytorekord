'use client'

import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { track } from './analytics'
import { PRESET_CITIES, reverseGeocode } from './api'
import { indexOfMonthDay, indexOfToday, monthDayOf } from './calendar'
import { daySnapshot, extremeDays } from './compute'
import DayHistory from './components/DayHistory'
import DayScrubber from './components/DayScrubber'
import LocationPicker from './components/LocationPicker'
import AboutModal from './components/AboutModal'
import CityCompare from './components/CityCompare'
import LifePanel from './components/LifePanel'
import RankBars, { type RankItem } from './components/RankBars'
import ShareButton from './components/ShareButton'
import WarmingStripes from './components/WarmingStripes'
import type { ShareCard } from './share'
import { dayLabel, monthNom, ordinal, yearsWord } from './format'
import { loadClimate } from './load'
import { thermalForTemp } from './palette'
import type { ClimateData, Place } from './types'
import { useCountUp } from './useCountUp'
import { readUrlState, shareUrl, writeUrlState } from './url'

type Status = 'idle' | 'loading' | 'ready' | 'error'
const LS_KEY = 'czytorekord.place'

export default function App() {
  const [status, setStatus] = useState<Status>('loading')
  const [data, setData] = useState<ClimateData | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [lastPlace, setLastPlace] = useState<Place | null>(null)
  // a shared link carries the calendar day; capture it once for the dashboard
  const [initialMonthDay] = useState<string | null>(() => readUrlState().monthDay)

  // Priority: shared URL → last-used place → geolocation → Warsaw.
  // On a first visit we ASK for location; if denied/ignored/unavailable we fall
  // back to Warsaw. (The picker also offers "Użyj mojej lokalizacji" anytime.)
  useEffect(() => {
    const url = readUrlState()
    if (url.place) {
      load(url.place)
      return
    }
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      try {
        load(JSON.parse(saved))
        return
      } catch {
        /* fall through */
      }
    }

    // first visit
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      load(PRESET_CITIES[0])
      return
    }
    let settled = false
    const useWarsaw = () => {
      if (settled) return
      settled = true
      load(PRESET_CITIES[0])
    }
    // don't get stuck loading if the user ignores the permission prompt
    const ignoreTimer = setTimeout(useWarsaw, 6000)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (settled) return
        settled = true
        clearTimeout(ignoreTimer)
        try {
          load(await reverseGeocode(pos.coords.latitude, pos.coords.longitude))
        } catch {
          load(PRESET_CITIES[0])
        }
      },
      () => {
        clearTimeout(ignoreTimer)
        useWarsaw()
      },
      { timeout: 8000, maximumAge: 600000 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(place: Place) {
    setPickerOpen(false)
    setStatus('loading')
    setLastPlace(place)
    setRateLimited(false)
    try {
      const d = await loadClimate(place)
      setData(d)
      setStatus('ready')
      track('place_load', { place: place.name })
      localStorage.setItem(LS_KEY, JSON.stringify(place))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setRateLimited(msg.includes('429'))
      setStatus('error')
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="ambient" />
      {status === 'loading' && <LoadingStage label="Wczytuję 80 lat pogody…" />}

      {status === 'error' && (
        <div className="center-stage">
          <motion.div
            className="pulse"
            style={{ opacity: 0.5 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          {rateLimited ? (
            <div className="error-box">
              <p className="error-title">Za dużo zapytań do API pogodowego</p>
              <p>
                Darmowe źródło danych (Open-Meteo) chwilowo ogranicza liczbę zapytań z tej sieci.
                To przejściowe — spróbuj ponownie za chwilę.
              </p>
            </div>
          ) : (
            <div className="error-box">
              <p className="error-title">Nie udało się pobrać danych</p>
              <p>Sprawdź połączenie z internetem albo wybierz inne miejsce.</p>
            </div>
          )}
          <div className="error-actions">
            {lastPlace && (
              <button className="place-btn" onClick={() => load(lastPlace)}>
                <span className="dot" /> Spróbuj ponownie
              </button>
            )}
            <button className="chip" onClick={() => setPickerOpen(true)}>
              Wybierz inne miejsce
            </button>
          </div>
        </div>
      )}

      {status === 'ready' && data && (
        <Dashboard
          data={data}
          initialMonthDay={initialMonthDay}
          onChangePlace={() => setPickerOpen(true)}
        />
      )}

      <AnimatePresence>
        {pickerOpen && (
          <LocationPicker onPick={load} onClose={data ? () => setPickerOpen(false) : null} />
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}

function LoadingStage({ label }: { label: string }) {
  return (
    <div className="center-stage">
      <motion.div
        className="pulse"
        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <p className="loader-text">{label}</p>
    </div>
  )
}

function Dashboard({
  data,
  initialMonthDay,
  onChangePlace,
}: {
  data: ClimateData
  initialMonthDay: string | null
  onChangePlace: () => void
}) {
  const { place, current } = data
  const today = useMemo(() => new Date(), [])
  const thisYear = today.getFullYear()
  const todayIdx = useMemo(() => indexOfToday(today), [today])

  const [index, setIndex] = useState(() => {
    const fromUrl = initialMonthDay ? indexOfMonthDay(initialMonthDay) : -1
    return fromUrl >= 0 ? fromUrl : todayIdx
  })
  const isToday = index === todayIdx
  const isFuture = index > todayIdx
  const monthDay = monthDayOf(index)
  const selMonth = Number(monthDay.slice(0, 2))
  const selDate = useMemo(() => new Date(thisYear, selMonth - 1, Number(monthDay.slice(3))), [
    thisYear,
    selMonth,
    monthDay,
  ])
  const label = dayLabel(selDate)

  const snap = useMemo(
    () => daySnapshot(data.series, monthDay, thisYear, isToday, isToday ? data.todayValue : null),
    [data, monthDay, thisYear, isToday],
  )

  const hasSubject = snap.subjectValue != null
  const displayValue = snap.subjectValue ?? snap.recordHot?.tmax ?? 0
  const heroColor = thermalForTemp(displayValue)
  const temp = useCountUp(displayValue, 0.6)

  // ambient glow follows whatever the hero shows
  useEffect(() => {
    document.documentElement.style.setProperty('--glow', heroColor)
  }, [heroColor])

  // reflect the current view (place + day) into the URL → shareable permalink
  useEffect(() => {
    writeUrlState(place, monthDay)
  }, [place, monthDay])

  const [aboutOpen, setAboutOpen] = useState(false)
  const extremes = useMemo(() => extremeDays(data.series), [data.series])
  function jumpTo(md: string, kind: string) {
    track('shortcut', { kind })
    let i = indexOfMonthDay(md)
    if (i < 0) i = indexOfMonthDay('02-28') // 29 Feb isn't in the 365-day calendar
    if (i >= 0) setIndex(i)
  }

  const v = snap.verdict
  const isRecord = hasSubject && v?.lastHotterYear == null
  const yearsAgo = v?.lastHotterYear ? thisYear - v.lastHotterYear : 0

  // Today's headline counts as a *forecast* only while the daily peak is still
  // ahead (morning/early afternoon). Once the peak has passed (e.g. evening) the
  // reached max is effectively final — drop the "prognoza" framing. `measured`
  // is the highest temperature actually reached so far today.
  const measured = data.todayMaxSoFar
  const todayProjected = isToday && hasSubject && data.todayPeakAhead
  const recordConfirmed = isToday && isRecord && !!v && measured >= v.dayMax

  // Warm vs cold narrative: pick the side this day leans toward, so a frosty
  // winter day isn't described as "gorąco". Today (summer forecast) stays warm.
  const warmSide = isToday || (!!v && v.percentile >= 50)
  const isColdRecord = hasSubject && v != null && v.lastColderYear == null
  const warmWord = displayValue >= 28 ? 'gorąco' : 'ciepło'
  const coldWord = displayValue <= -8 ? 'mroźno' : 'zimno'
  const warmerPct = v ? Math.round(v.percentile) : 0
  const colderPct = v ? Math.round(100 - v.percentile) : 0

  // hottest <selected month> across all years
  const hottestMonth: RankItem[] = useMemo(
    () =>
      data.monthStats
        .filter((m) => m.month === selMonth && !Number.isNaN(m.mean))
        .sort((a, b) => b.mean - a.mean)
        .slice(0, 8)
        .map((m) => ({
          label: String(m.year),
          value: m.mean,
          colorTemp: m.mean + 12,
          highlight: m.year === thisYear,
        })),
    [data, selMonth, thisYear],
  )

  const completeYears = useMemo(
    () => data.yearStats.filter((y) => y.year < thisYear),
    [data, thisYear],
  )

  const hottestYears: RankItem[] = useMemo(
    () =>
      [...completeYears]
        .sort((a, b) => b.mean - a.mean)
        .slice(0, 8)
        .map((y) => ({ label: String(y.year), value: y.mean, colorTemp: y.mean + 12 })),
    [completeYears],
  )

  const mostHotDays: RankItem[] = useMemo(
    () =>
      [...completeYears]
        .sort((a, b) => b.hotDays - a.hotDays)
        .slice(0, 8)
        .map((y) => ({
          label: String(y.year),
          value: y.hotDays,
          colorTemp: 28 + (y.hotDays / 40) * 12,
          suffix: ' dni',
        })),
    [completeYears],
  )

  const mostTropical: RankItem[] = useMemo(
    () =>
      [...completeYears]
        .sort((a, b) => b.tropicalNights - a.tropicalNights)
        .slice(0, 8)
        .map((y) => ({
          label: String(y.year),
          value: y.tropicalNights,
          colorTemp: 30 + (y.tropicalNights / 20) * 10,
          suffix: ' nocy',
        })),
    [completeYears],
  )

  // Plain-text verdict for the share image + clipboard (mirrors the hero copy).
  const shareCardData: ShareCard = (() => {
    let verdict = ''
    let sub = ''
    if (!hasSubject) {
      verdict = `Rekord ${label}: ${snap.recordHot?.tmax.toFixed(1)}°C w ${snap.recordHot?.year}.`
      sub = `Średnia dla tego dnia ${snap.avg.toFixed(1)}°C, najchłodniej ${snap.recordCold?.tmax.toFixed(1)}°C w ${snap.recordCold?.year}.`
    } else if (warmSide) {
      if (isRecord) {
        verdict = recordConfirmed
          ? `Rekord ${label} już padł!`
          : todayProjected
            ? `Dziś zapowiada się najcieplejszy ${label} w historii!`
            : `Najcieplejszy ${label} w historii pomiarów!`
        sub = todayProjected
          ? `Prognozowane maksimum ${snap.subjectValue!.toFixed(1)}°C, poprzedni rekord ${v!.dayMax.toFixed(1)}°C (od ${data.startYear}).`
          : `Poprzednie maksimum ${v!.dayMax.toFixed(1)}°C. Dane od ${data.startYear} roku.`
      } else {
        verdict = `Tak ${warmWord} ${label} ostatnio było w ${v!.lastHotterYear}.`
        sub = `Wtedy ${v!.lastHotterValue?.toFixed(1)}°C — ${yearsAgo} ${yearsWord(yearsAgo)} temu. ${ordinal(v!.dayRank)} najcieplejszy ${label} od ${data.startYear}.`
      }
    } else {
      if (isColdRecord) {
        verdict = `Najzimniejszy ${label} w historii pomiarów!`
        sub = `Poprzednie minimum ${v!.dayMin.toFixed(1)}°C. Dane od ${data.startYear} roku.`
      } else {
        const cy = thisYear - (v!.lastColderYear ?? thisYear)
        verdict = `Tak ${coldWord} ${label} ostatnio było w ${v!.lastColderYear}.`
        sub = `Wtedy ${v!.lastColderValue?.toFixed(1)}°C — ${cy} ${yearsWord(cy)} temu. ${ordinal(v!.coldRank)} najzimniejszy ${label} od ${data.startYear}.`
      }
    }
    return {
      place: place.name,
      dateLabel: `${label} ${thisYear}`,
      tempText: displayValue.toFixed(1),
      color: heroColor,
      verdict,
      sub,
      forecast: todayProjected,
      url: shareUrl(place, monthDay),
      chart: [
        ...snap.history,
        ...(snap.subjectValue != null ? [{ year: thisYear, tmax: snap.subjectValue }] : []),
      ],
      chartHighlightYear: snap.subjectValue != null ? thisYear : snap.recordHot?.year,
      chartLabel: `${label} · maks. rok po roku`,
    }
  })()

  return (
    <div className="shell">
      <div className="topbar">
        <span className="brand">Czy to rekord?</span>
        <button
          className="place-btn"
          onClick={onChangePlace}
          aria-label={`Zmień miejsce — obecnie ${place.name}`}
        >
          <span className="dot" aria-hidden="true" />
          {place.name}
        </button>
      </div>

      <DayScrubber index={index} todayIndex={todayIdx} label={label} onChange={setIndex} />

      <div className="scrub-shortcuts">
        <span className="scrub-shortcuts-label">skocz do:</span>
        <button className="chip" onClick={() => jumpTo(extremes.hottest.monthDay, 'hottest')}>
          🔥 najcieplejszy dzień ({extremes.hottest.tmax.toFixed(1)}°C · {extremes.hottest.year})
        </button>
        <button className="chip" onClick={() => jumpTo(extremes.coldest.monthDay, 'coldest')}>
          ❄️ najzimniejszy dzień ({extremes.coldest.tmax.toFixed(1)}°C · {extremes.coldest.year})
        </button>
      </div>

      {/* HERO VERDICT */}
      <section className="hero">
        <p className="hero-kicker">
          {isToday ? (
            <>
              {label} · teraz {current.temperature.toFixed(1)}°C · maks. dziś{' '}
              {data.todayMaxSoFar.toFixed(1)}°C
            </>
          ) : hasSubject ? (
            <>{label} {thisYear}</>
          ) : (
            <>{label} · rekord z {snap.recordHot?.year}</>
          )}
        </p>

        <div className="hero-temp" style={{ color: heroColor }}>
          {temp.toFixed(1)}
          <sup>°C</sup>
        </div>

        {todayProjected && (
          <p className="hero-forecast">⌁ prognoza na dziś · dzień dopiero trwa</p>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={monthDay + String(hasSubject)}
            aria-live="polite"
            aria-atomic="true"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {hasSubject ? (
              <>
                {warmSide ? (
                  <>
                    <p className="hero-verdict">
                      {isRecord ? (
                        recordConfirmed ? (
                          <>🔥 Rekord {label} już padł!</>
                        ) : todayProjected ? (
                          <>🔥 Dziś zapowiada się najcieplejszy {label} w historii!</>
                        ) : (
                          <>🔥 Najcieplejszy {label} w historii pomiarów!</>
                        )
                      ) : (
                        <>
                          {todayProjected ? 'Prognozowany szczyt dnia bije ostatnie lata — ' : ''}
                          Tak {warmWord} {label} ostatnio było w {v!.lastHotterYear}.
                        </>
                      )}
                    </p>
                    <p className="hero-sub">
                      {isRecord ? (
                        todayProjected ? (
                          <>
                            Prognozowane maksimum <b>{snap.subjectValue!.toFixed(1)}°C</b> · poprzedni
                            rekord <b>{v!.dayMax.toFixed(1)}°C</b> (dane od {data.startYear}).
                            Dotychczas dziś najwyżej <b>{measured.toFixed(1)}°C</b>.
                          </>
                        ) : (
                          <>
                            Poprzednie maksimum: <b>{v!.dayMax.toFixed(1)}°C</b>. Dane od{' '}
                            <b>{data.startYear}</b> roku.
                          </>
                        )
                      ) : (
                        <>
                          Wtedy padło <b>{v!.lastHotterValue?.toFixed(1)}°C</b> — to{' '}
                          <b>
                            {yearsAgo} {yearsWord(yearsAgo)}
                          </b>{' '}
                          temu. To <b>{ordinal(v!.dayRank)}</b> najcieplejszy {label} od{' '}
                          {data.startYear}.
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="hero-verdict">
                      {isColdRecord ? (
                        <>🥶 Najzimniejszy {label} w historii pomiarów!</>
                      ) : (
                        <>
                          Tak {coldWord} {label} ostatnio było w {v!.lastColderYear}.
                        </>
                      )}
                    </p>
                    <p className="hero-sub">
                      {isColdRecord ? (
                        <>
                          Poprzednie minimum: <b>{v!.dayMin.toFixed(1)}°C</b>. Dane od{' '}
                          <b>{data.startYear}</b> roku.
                        </>
                      ) : (
                        <>
                          Wtedy zmierzono <b>{v!.lastColderValue?.toFixed(1)}°C</b> — to{' '}
                          <b>
                            {thisYear - (v!.lastColderYear ?? thisYear)}{' '}
                            {yearsWord(thisYear - (v!.lastColderYear ?? thisYear))}
                          </b>{' '}
                          temu. To <b>{ordinal(v!.coldRank)}</b> najzimniejszy {label} od{' '}
                          {data.startYear}.
                        </>
                      )}
                    </p>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="hero-verdict">
                  Rekord {label}: <span style={{ color: heroColor }}>{snap.recordHot?.tmax.toFixed(1)}°C</span> w{' '}
                  {snap.recordHot?.year}.
                </p>
                <p className="hero-sub">
                  Średnia dla tego dnia: <b>{snap.avg.toFixed(1)}°C</b> · najchłodniej{' '}
                  <b>{snap.recordCold?.tmax.toFixed(1)}°C</b> w {snap.recordCold?.year}.{' '}
                  {isFuture
                    ? `Ten dzień ${thisYear} jeszcze nie nadszedł.`
                    : `Pomiar z ${thisYear} nie jest jeszcze dostępny w archiwum.`}
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {hasSubject && v && (
          <div className="badges">
            <span className="badge">
              {warmSide ? (
                <>
                  cieplej niż <b>{warmerPct}%</b> takich dni w historii
                </>
              ) : (
                <>
                  zimniej niż <b>{colderPct}%</b> takich dni w historii
                </>
              )}
            </span>
            <span className="badge">
              średnia dla tego dnia: <b>{v.dayAvg.toFixed(1)}°C</b>
            </span>
            <span className="badge">
              {warmSide ? (
                <>
                  #<b>{v.allTimeRank}</b> najgorętszy dzień <i>w ogóle</i>
                </>
              ) : (
                <>
                  #<b>{v.allTimeColdRank}</b> najzimniejszy dzień <i>w ogóle</i>
                </>
              )}{' '}
              (z {v.allTimeTotal.toLocaleString('pl')})
            </span>
          </div>
        )}

        <div className="share-row">
          <ShareButton card={shareCardData} />
        </div>
      </section>

      {/* PANELS */}
      <div className="grid">
        <div className="panel wide">
          <p className="panel-title">Ten dzień w historii — {label}</p>
          <p className="panel-note">
            Maksymalna temperatura {label} w każdym roku od {snap.history[0]?.year ?? data.startYear}.
            {hasSubject ? ' Wyróżniony słupek to bieżący rok.' : ' Wyróżniony słupek to rekord.'}
          </p>
          <DayHistory
            history={snap.history}
            subjectValue={snap.subjectValue}
            subjectYear={thisYear}
            subjectIsToday={isToday}
            label={label}
          />
        </div>

        <div className="panel wide">
          <p className="panel-title">Ocieplenie — paski Hawkinsa</p>
          <p className="panel-note">
            Każdy pasek to jeden rok dla {place.name}. Im bardziej czerwony, tym cieplejszy względem
            normy z lat 1951–1980.
          </p>
          <WarmingStripes years={data.yearStats} />
        </div>

        <div className="panel wide">
          <p className="panel-title">Twój wiek w upałach</p>
          <p className="panel-note">
            Ile dni upalnych i nocy tropikalnych {place.name} przeżyło razem z Tobą.
          </p>
          <LifePanel
            years={data.yearStats}
            thisYear={thisYear}
            place={place.name}
            url={shareUrl(place, monthDay)}
          />
        </div>

        <div className="panel wide">
          <p className="panel-title">Porównaj miasta</p>
          <p className="panel-note">
            Zestaw {place.name} z innym miastem dla wybranego dnia ({label}).
          </p>
          <CityCompare base={data} monthDay={monthDay} thisYear={thisYear} label={label} />
        </div>


        <div className="panel">
          <p className="panel-title">Najcieplejszy {monthNom(selMonth)} w historii</p>
          <p className="panel-note">Ranking lat według średniej temperatury miesiąca.</p>
          <RankBars items={hottestMonth} />
        </div>

        <div className="panel">
          <p className="panel-title">Najcieplejsze lata</p>
          <p className="panel-note">Średnia roczna temperatura (pełne lata).</p>
          <RankBars items={hottestYears} />
        </div>

        <div className="panel">
          <p className="panel-title">Najwięcej dni upalnych</p>
          <p className="panel-note">Dni z maks. temperaturą ≥ 30°C w roku.</p>
          <RankBars items={mostHotDays} colorMin={20} colorMax={40} />
        </div>

        <div className="panel">
          <p className="panel-title">Najwięcej nocy tropikalnych</p>
          <p className="panel-note">Noce, gdy temperatura nie spadła poniżej 20°C.</p>
          <RankBars items={mostTropical} colorMin={20} colorMax={40} />
        </div>
      </div>

      <p className="footer">
        <button className="footer-link" onClick={() => setAboutOpen(true)}>
          O projekcie / Metodologia
        </button>{' '}
        · Dane: <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> ·
        reanaliza ERA5, od {data.startYear} ·{' '}
        <a href="mailto:pjsagent@gmail.com">Kontakt / współpraca</a>
      </p>

      {aboutOpen && <AboutModal startYear={data.startYear} onClose={() => setAboutOpen(false)} />}
    </div>
  )
}
