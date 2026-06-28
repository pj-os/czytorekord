export interface Place {
  name: string
  admin: string | null
  country: string
  latitude: number
  longitude: number
  slug?: string
}

export interface CurrentWeather {
  temperature: number
  time: string
  weatherCode: number
  isDay: boolean
}

/** Raw parallel arrays straight from the Open-Meteo archive API. */
export interface DailySeries {
  time: string[]
  tmax: number[]
  tmin: number[]
  tmean: number[]
}

export interface DayInHistory {
  year: number
  tmax: number
}

export interface YearStat {
  year: number
  mean: number
  hotDays: number // days with tmax >= 30
  tropicalNights: number // nights with tmin >= 20
}

export interface MonthStat {
  year: number
  month: number // 1-12
  mean: number
}

export interface Verdict {
  /** rank among all readings for this same calendar day across history (1 = hottest ever) */
  dayRank: number
  dayTotal: number
  /** rank from the cold end for this calendar day (1 = coldest ever) */
  coldRank: number
  /** last year (before this one) that was hotter on this calendar day; null if today is the all-time record */
  lastHotterYear: number | null
  lastHotterValue: number | null
  /** last year (before this one) that was colder on this calendar day; null if today is the coldest */
  lastColderYear: number | null
  lastColderValue: number | null
  /** percentile 0-100 of today vs this-calendar-day history (share of days cooler-or-equal) */
  percentile: number
  /** rank among ALL days ever recorded (any date), 1 = hottest */
  allTimeRank: number
  /** rank among ALL days ever recorded (any date), 1 = coldest */
  allTimeColdRank: number
  allTimeTotal: number
  dayMin: number
  dayMax: number
  dayAvg: number
}

export interface DaySnapshot {
  monthDay: string
  history: DayInHistory[] // prior years only (year < current)
  subjectValue: number | null // current-year value on this date, or null if not yet known
  verdict: Verdict | null // present only when subjectValue is known
  recordHot: DayInHistory | null
  recordCold: DayInHistory | null
  avg: number
}

export interface ClimateData {
  place: Place
  current: CurrentWeather
  /** the value we judge — the day's max (reached so far, or still forecast) */
  todayValue: number
  /** highest temperature actually reached so far today */
  todayMaxSoFar: number
  /** true while today's peak is still ahead (value is a forecast, not yet realized) */
  todayPeakAhead: boolean
  series: DailySeries
  dayInHistory: DayInHistory[]
  yearStats: YearStat[]
  monthStats: MonthStat[]
  verdict: Verdict
  startYear: number
  endYear: number
}
