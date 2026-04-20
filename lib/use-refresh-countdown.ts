'use client'

import { useEffect, useState } from 'react'

/**
 * Returns the number of seconds remaining until the next wall-clock
 * `intervalMinutes` boundary (e.g. for 15, the next :00, :15, :30 or :45
 * minute mark of the current hour). Because the target is derived from the
 * current clock time — not from when the component mounted — every page and
 * every device shows the same countdown value at the same instant. This is
 * what makes the Home GMP tracker and the IPO detail page timers stay in
 * sync.
 *
 * Returns `null` on the server / first render to avoid a hydration mismatch.
 */
export function useRefreshCountdown(intervalMinutes = 15): number | null {
  const [seconds, setSeconds] = useState<number | null>(null)

  useEffect(() => {
    const periodMs = intervalMinutes * 60 * 1000

    const compute = () => {
      const remainingMs = periodMs - (Date.now() % periodMs)
      // Clamp to >=1 second so we never briefly show 0:00 before the rollover.
      return Math.max(1, Math.ceil(remainingMs / 1000))
    }

    setSeconds(compute())
    const id = setInterval(() => setSeconds(compute()), 1000)
    return () => clearInterval(id)
  }, [intervalMinutes])

  return seconds
}

/**
 * Formats a second count as `M:SS`, or `--:--` while the hook is still
 * hydrating (first paint).
 */
export function formatRefreshCountdown(seconds: number | null): string {
  if (seconds == null) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
