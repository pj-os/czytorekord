interface Props {
  startYear: number
}

/** Pure, server-renderable methodology content. Used by the modal (SPA) and the /o-projekcie page (SSR). */
export default function AboutContent({ startYear }: Props) {
  return (
    <>
      <h2>O projekcie</h2>
      <p>
        <b>Czy to rekord?</b> pokazuje, jak dzisiejsza temperatura w Twoim mieście wypada na tle
        ponad 80 lat historii pogody — czy to rekord ciepła albo zimna dla danego dnia, kiedy
        ostatnio było podobnie i jak zmienia się klimat Polski.
      </p>

      <h3>Skąd dane</h3>
      <p>
        Źródłem jest <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>{' '}
        i reanaliza <b>ERA5</b> (ECMWF) — spójny, godzinowy model pogody dla całego globu od{' '}
        <b>{startYear}</b> roku. Dane są agregowane do wartości dziennych (maks./min./średnia).
      </p>

      <h3>Jak liczymy</h3>
      <ul>
        <li>
          <b>Rekord dnia</b> — najwyższa (lub najniższa) dzienna temperatura maksymalna dla danej
          daty kalendarzowej w całym dostępnym okresie.
        </li>
        <li>
          <b>Dzień upalny</b> — temperatura maksymalna ≥ 30°C.
        </li>
        <li>
          <b>Noc tropikalna</b> — temperatura minimalna nie spadła poniżej 20°C.
        </li>
        <li>
          <b>Paski ocieplenia</b> — odchylenie średniej rocznej od normy z lat 1951–1980.
        </li>
      </ul>

      <h3>Prognoza vs pomiar</h3>
      <p>
        Dla bieżącego dnia pokazujemy <b>prognozowane</b> maksimum (dzień jeszcze trwa) i wyraźnie to
        oznaczamy. „Rekord padł" piszemy dopiero, gdy <b>zmierzona</b> temperatura przebije
        dotychczasowy rekord.
      </p>

      <h3>Ograniczenia</h3>
      <p>
        ERA5 to reanaliza w siatce ~9–25 km, więc wartości mogą się nieznacznie różnić od pomiarów z
        konkretnej stacji (np. IMGW). Dzienna średnia jest tu przybliżana jako (maks.+min.)/2.
        Projekt ma charakter informacyjno-edukacyjny.
      </p>

      <h3>Kontakt i współpraca</h3>
      <p>
        Masz pomysł, uwagę albo propozycję współpracy? Napisz:{' '}
        <a href="mailto:pjsagent@gmail.com">pjsagent@gmail.com</a>.
      </p>
    </>
  )
}
