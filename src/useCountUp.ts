import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/**
 * Animate a number toward `target`. On first mount runs 0 → target; when the
 * target later changes (e.g. user scrubs to another day) it tweens smoothly
 * from the currently displayed value to the new one.
 */
export function useCountUp(target: number, duration = 0.9): number {
  const [val, setVal] = useState(0)
  const current = useRef(0)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      current.current = target
      setVal(target)
      return
    }
    const controls = animate(current.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        current.current = v
        setVal(v)
      },
    })
    return () => controls.stop()
  }, [target, duration])
  return val
}
