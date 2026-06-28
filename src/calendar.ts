// Fixed 365-day calendar (non-leap reference year 2025) so a slider index
// 0..364 maps cleanly to a month/day. Feb 29 is intentionally omitted.
export interface CalDay {
  month: number // 1-12
  day: number // 1-31
}

export const CALENDAR: CalDay[] = (() => {
  const out: CalDay[] = []
  const d = new Date(2025, 0, 1)
  for (let i = 0; i < 365; i++) {
    out.push({ month: d.getMonth() + 1, day: d.getDate() })
    d.setDate(d.getDate() + 1)
  }
  return out
})()

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function monthDayOf(index: number): string {
  const c = CALENDAR[Math.max(0, Math.min(364, index))]
  return `${pad(c.month)}-${pad(c.day)}`
}

export function indexOfToday(today: Date): number {
  const m = today.getMonth() + 1
  const d = today.getDate()
  const i = CALENDAR.findIndex((c) => c.month === m && c.day === d)
  return i >= 0 ? i : 0
}

/** Map an "MM-DD" string back to its calendar index, or -1 if not found. */
export function indexOfMonthDay(monthDay: string): number {
  const [m, d] = monthDay.split('-').map(Number)
  return CALENDAR.findIndex((c) => c.month === m && c.day === d)
}

export function wrapIndex(i: number): number {
  return ((i % 365) + 365) % 365
}
