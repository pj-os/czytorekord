// Thermal color ramp: cold deep-blue → teal → amber → incandescent red.
// Stops are [position 0..1, [r,g,b]].
const STOPS: [number, [number, number, number]][] = [
  [0.0, [12, 28, 84]], // deep cold blue
  [0.2, [22, 96, 170]], // blue
  [0.4, [40, 170, 180]], // teal
  [0.55, [120, 200, 120]], // green
  [0.68, [240, 214, 90]], // yellow
  [0.82, [240, 140, 50]], // orange
  [0.92, [224, 64, 40]], // red
  [1.0, [150, 14, 18]], // incandescent deep red
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** t in [0,1] → "rgb(r,g,b)" on the thermal ramp. */
export function thermal(t: number): string {
  const x = Math.max(0, Math.min(1, t))
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [p0, c0] = STOPS[i]
    const [p1, c1] = STOPS[i + 1]
    if (x >= p0 && x <= p1) {
      const f = (x - p0) / (p1 - p0)
      const r = Math.round(lerp(c0[0], c1[0], f))
      const g = Math.round(lerp(c0[1], c1[1], f))
      const b = Math.round(lerp(c0[2], c1[2], f))
      return `rgb(${r},${g},${b})`
    }
  }
  const last = STOPS[STOPS.length - 1][1]
  return `rgb(${last[0]},${last[1]},${last[2]})`
}

/** Map a temperature (°C) into [0,1] over a sensible Polish climate range. */
export function tempToT(temp: number, min = -15, max = 40): number {
  return (temp - min) / (max - min)
}

export function thermalForTemp(temp: number, min = -15, max = 40): string {
  return thermal(tempToT(temp, min, max))
}
