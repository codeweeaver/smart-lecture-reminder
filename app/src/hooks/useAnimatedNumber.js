import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// rAF-driven count-up from the previous value to `target`. Skips the
// animation entirely under prefers-reduced-motion.
export function useAnimatedNumber(target, { duration = 800 } = {}) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const frameRef = useRef(null)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return

    if (prefersReducedMotion()) {
      setValue(target)
      fromRef.current = target
      return
    }

    const start = performance.now()
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - (1 - progress) * (1 - progress) // ease-out quad
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}
