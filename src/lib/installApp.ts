import { useSyncExternalStore } from 'react'

interface InstallPrompt extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const display = window.matchMedia('(display-mode: standalone)')
const listeners = new Set<() => void>()
let prompt: InstallPrompt | undefined
let installed = false

function notify() {
  for (const listener of listeners) listener()
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  prompt = event as InstallPrompt
  notify()
})

window.addEventListener('appinstalled', () => {
  installed = true
  prompt = undefined
  notify()
})

display.addEventListener('change', notify)

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function state() {
  if (display.matches || ('standalone' in navigator && navigator.standalone) || installed) return 'installed'
  return prompt ? 'prompt' : 'manual'
}

export function useInstallState() {
  return useSyncExternalStore(subscribe, state)
}

export async function installApp() {
  const event = prompt
  if (!event) return
  prompt = undefined
  notify()
  if ((await event.prompt()).outcome === 'accepted') {
    installed = true
    notify()
  }
}

let registration: Promise<ServiceWorkerRegistration> | undefined

export function registerAppWorker() {
  const file = import.meta.env.PROD ? 'app-worker.js' : 'reminder-worker.js'
  const url = new URL(`${import.meta.env.BASE_URL}${file}`, window.location.origin)
  registration ??= navigator.serviceWorker.register(url).catch((error) => {
    registration = undefined
    throw error
  })
  return registration
}
