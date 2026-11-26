import { useEffect, useState } from 'react'
import { toKey } from '../lib/dates'
import { registerAppWorker } from '../lib/installApp'

interface Preference {
  enabled: boolean
  time: string
}

const validTime = /^([01]\d|2[0-3]):[0-5]\d$/

function readPreference(key: string): Preference {
  try {
    const preference = JSON.parse(localStorage.getItem(key) ?? '{}')
    if (typeof preference?.time === 'string' && validTime.test(preference.time)) {
      return { enabled: preference.enabled === true, time: preference.time }
    }
  } catch { /* Reminders stay off until enabled. */ }
  return { enabled: false, time: '08:00' }
}

async function notify(outstanding: number) {
  const title = 'Hexis habit reminder'
  const options = {
    body: `You have ${outstanding} unfinished ${outstanding === 1 ? 'habit' : 'habits'} today.`,
    tag: 'hexis-daily-reminder',
  }

  if ('serviceWorker' in navigator) {
    try {
      await registerAppWorker()
      const worker = await navigator.serviceWorker.ready
      await worker.showNotification(title, options)
      return
    } catch { /* Some browsers support page notifications without a service worker. */ }
  }
  new Notification(title, options)
}

export function useReminder(userId: string, outstanding: number) {
  const key = `hexis-reminder-v1:${userId}`
  const [preference, setPreference] = useState(() => readPreference(key))
  const [error, setError] = useState('')
  const supported = 'Notification' in window && window.isSecureContext

  useEffect(() => {
    if (!supported || !preference.enabled || !outstanding) return
    const sentKey = `${key}:last-sent`
    let active = true
    let delivering = false
    let sentInSession = ''

    async function check() {
      if (Notification.permission !== 'granted') return
      const now = new Date()
      const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      if (clock < preference.time) return
      const day = toKey(now)
      if (!active || delivering || sentInSession === day) return
      try {
        if (localStorage.getItem(sentKey) === day) return
      } catch { /* The current tab still deduplicates notifications. */ }
      delivering = true
      try {
        await notify(outstanding)
        sentInSession = day
        try { localStorage.setItem(sentKey, day) } catch { /* Deduplicate in this tab. */ }
        if (active) setError('')
      } catch {
        if (active) setError('This browser could not show a notification. Check its notification settings.')
      } finally {
        delivering = false
      }
    }

    const checkNow = () => {
      if (navigator.locks) void navigator.locks.request(sentKey, check)
      else void check()
    }
    const timer = window.setInterval(checkNow, 30_000)
    window.addEventListener('focus', checkNow)
    document.addEventListener('visibilitychange', checkNow)
    checkNow()
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', checkNow)
      document.removeEventListener('visibilitychange', checkNow)
    }
  }, [key, outstanding, preference.enabled, preference.time, supported])

  async function save(time: string, enabled: boolean) {
    setError('')
    if (!validTime.test(time)) return false
    if (enabled) {
      try {
        const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
        if (permission !== 'granted') {
          setError('Allow notifications for Hexis in your browser settings to enable reminders.')
          return false
        }
      } catch {
        setError('This browser could not request notification permission.')
        return false
      }
    }
    const next = { time, enabled }
    setPreference(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* Apply the preference for this session. */ }
    return true
  }

  return { preference, supported, save, error }
}
