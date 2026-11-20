import { useEffect, useState } from 'react'
import { getSessionToday, refreshSessionToday, toKey } from '../lib/dates'

/**
 * Returns a stable "today" for the app session.
 *
 * Reading the clock during render is impure and would let the dashboard
 * compute a different set of days on every re-render. Instead we snapshot
 * the day once, and refresh it only when the calendar day actually rolls
 * over (checked on an interval and whenever the tab regains focus).
 */
export function useToday(): Date {
  const [today, setToday] = useState(getSessionToday)

  useEffect(() => {
    let currentKey = toKey(today)

    const sync = () => {
      const next = refreshSessionToday()
      const nextKey = toKey(next)
      if (nextKey !== currentKey) {
        currentKey = nextKey
        setToday(next)
      }
    }

    const interval = window.setInterval(sync, 60_000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [today])

  return today
}
