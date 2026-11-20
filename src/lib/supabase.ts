import { createClient } from '@supabase/supabase-js'

function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[\w-]+$/.test(key)) return true
  try {
    const [, claims] = key.split('.')
    return JSON.parse(atob(claims.replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'
  } catch {
    return false
  }
}

function makeClient() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key || !isPublicKey(key)) return null
  try {
    const endpoint = new URL(url)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
    if (endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:')) return null
    return createClient(url, key)
  } catch {
    return null
  }
}

// Read callback errors before the auth client handles the URL.
const query = new URLSearchParams(window.location.search)
const fragment = new URLSearchParams(window.location.hash.slice(1))
export const callbackError = query.get('error_description') || fragment.get('error_description')
export const supabase = makeClient()

export function authRedirect() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}
