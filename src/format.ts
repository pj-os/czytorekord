const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]
const MONTHS_NOM = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
]

/** "27 czerwca" */
export function dayLabel(d: Date): string {
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`
}

export function monthNom(month1to12: number): string {
  return MONTHS_NOM[month1to12 - 1]
}

/** Polish-correct year noun: 1 rok, 2-4 lata, 5+ lat (with teens exception). */
export function yearsWord(n: number): string {
  if (n === 1) return 'rok'
  const last = n % 10
  const last2 = n % 100
  if (last >= 2 && last <= 4 && !(last2 >= 12 && last2 <= 14)) return 'lata'
  return 'lat'
}

export function ordinal(n: number): string {
  return `${n}.`
}
