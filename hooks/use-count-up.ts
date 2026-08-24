"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Smoothly tweens a displayed number toward `value` whenever it changes.
 * Respects prefers-reduced-motion by snapping instantly.
 */
export function useCountUp(value: number, duration = 600): number {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const from = fromRef.current
    const to = value

    if (prefersReduced || from === to) {
      fromRef.current = to
      setDisplay(to)
      return
    }

    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      fromRef.current = to
    }
  }, [value, duration])

  return display
}
