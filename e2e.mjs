import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'

// Run with Node and Chromium from Playwright. The test provides its own
// Supabase HTTP fixtures and leaves any configured project untouched.
const { chromium } = await import(process.env.HEXIS_PLAYWRIGHT
  ? pathToFileURL(process.env.HEXIS_PLAYWRIGHT).href
  : 'playwright')
const origin = 'https://hexis-test.supabase.co'
process.env.VITE_SUPABASE_URL = origin
process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_hexis_smoke_test'

const server = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const url = server.resolvedUrls.local[0]
let browser

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'avery@example.test',
  aud: 'authenticated',
  role: 'authenticated',
  user_metadata: { full_name: 'Avery' },
  app_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 86_400 })}.c2ln`
const tables = {
  profiles: new Map(), habits: new Map(), habit_logs: new Map(), daily_affirmations: new Map(),
}
let failNextNote = false

function keyFor(table, row) {
  if (table === 'habit_logs') return `${row.habit_id}:${row.day}`
  if (table === 'daily_affirmations') return row.day
  return row.id
}

async function mockSupabase(route) {
  const request = route.request()
  const endpoint = new URL(request.url())
  const method = request.method()
  const [service, , table, rpc] = endpoint.pathname.slice(1).split('/')
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': '*',
  }
  const send = (json, status = 200) => route.fulfill(json === undefined ? { status, headers } : { status, headers, json })
  if (method === 'OPTIONS') return send(undefined, 204)
  if (service === 'auth') {
    if (table === 'token') return send({ access_token: token, refresh_token: 'smoke-test-refresh-token', expires_in: 86_400, token_type: 'bearer', user })
    if (table === 'authorize') {
      assert.equal(endpoint.searchParams.get('provider'), 'github')
      const callback = new URL(endpoint.searchParams.get('redirect_to'))
      assert.equal(callback.href, url)
      callback.hash = new URLSearchParams({
        access_token: token, refresh_token: 'smoke-test-refresh-token', expires_in: '86400', token_type: 'bearer', type: 'signup',
      }).toString()
      return route.fulfill({ status: 302, headers: { location: callback.href } })
    }
    if (table === 'user') return send(user)
    if (table === 'logout') return send(undefined, 204)
    if (table === 'otp' || table === 'recover') return send({})
    throw new Error(`Unmocked auth route ${endpoint.pathname}`)
  }

  assert.equal(request.headers().authorization, `Bearer ${token}`)
  if (table === 'rpc' && (rpc === 'merge_guest_journal' || rpc === 'import_modern_journal')) {
    const { payload } = request.postDataJSON()
    for (const habit of payload.habits) {
      const id = tables.habits.has(habit.id) ? habit.id : `guest-${habit.id}`
      if (!tables.habits.has(id)) tables.habits.set(id, { ...habit, id, user_id: user.id })
    }
    for (const log of payload.logs) {
      const habitId = tables.habits.has(log.habit_id) ? log.habit_id : `guest-${log.habit_id}`
      const row = { ...log, habit_id: habitId, user_id: user.id }
      const key = keyFor('habit_logs', row)
      if (!tables.habit_logs.has(key)) tables.habit_logs.set(key, row)
    }
    for (const note of payload.affirmations) {
      if (!tables.daily_affirmations.has(note.day)) tables.daily_affirmations.set(note.day, { ...note, user_id: user.id })
    }
    return send(null)
  }
  if (table === 'rpc' && rpc === 'import_legacy_journal') {
    const { payload } = request.postDataJSON()
    for (const habit of payload.habits) {
      const id = `imported-${habit.legacy_id}`
      if (!tables.habits.has(id)) tables.habits.set(id, { ...habit, id, user_id: user.id })
    }
    for (const log of payload.logs) {
      const row = { habit_id: `imported-${log.legacy_id}`, day: log.day, value: 1, frozen: false, user_id: user.id }
      const key = keyFor('habit_logs', row)
      if (!tables.habit_logs.has(key)) tables.habit_logs.set(key, row)
    }
    for (const note of payload.affirmations) {
      if (!tables.daily_affirmations.has(note.day)) tables.daily_affirmations.set(note.day, { ...note, user_id: user.id })
    }
    return send(null)
  }

  assert.ok(tables[table], `Unmocked data route ${endpoint.pathname}`)
  if (method === 'POST') {
    if (table === 'daily_affirmations' && failNextNote) {
      failNextNote = false
      return send({ code: 'TEST_WRITE', message: 'Test write failed' }, 400)
    }
    for (const row of [].concat(request.postDataJSON())) {
      assert.equal(table === 'profiles' ? row.id : row.user_id, user.id)
      tables[table].set(keyFor(table, row), row)
    }
    return send(undefined, 201)
  }
  assert.equal(endpoint.searchParams.get('user_id'), `eq.${user.id}`)
  const match = (row) => [...endpoint.searchParams].every(([field, filter]) => !filter.startsWith('eq.') || filter.slice(3) === row[field])
  if (method === 'PATCH') {
    for (const [key, row] of tables[table]) if (match(row)) tables[table].set(key, { ...row, ...request.postDataJSON() })
    return send(undefined, 204)
  }
  if (method === 'DELETE') {
    for (const [key, row] of tables[table]) if (match(row)) tables[table].delete(key)
    return send(undefined, 204)
  }
  assert.equal(method, 'GET')
  return send([...tables[table].values()].filter(match))
}

try {
  browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
  })
  await context.route(`${origin}/**`, mockSupabase)
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-11-20T09:30:00+08:00'))
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const shots = process.env.HEXIS_TEST_SCREENSHOTS
  if (shots) await mkdir(shots, { recursive: true })
  const screenshot = async (name) => { if (shots) await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true, animations: 'disabled' }) }

  await page.goto(url)
  await page.getByText('Create your first habit to start tracking.').waitFor()
  assert.equal(tables.habits.size, 0)
  await page.getByRole('button', { name: 'Sign in or sign up' }).click()
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor()
  await page.getByRole('button', { name: 'Continue with GitHub' }).waitFor()
  await page.getByRole('button', { name: 'Use a magic link' }).click()
  await page.getByLabel('Email').fill(user.email)
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  await page.getByText('Check your email for a sign-in link.').waitFor()
  await page.getByRole('button', { name: 'Back to sign in' }).click()
  await page.getByLabel('Password').fill('a-testing-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('heading', { name: 'Good morning, Avery.' }).waitFor()
  await page.getByText('Create your first habit to start tracking.').waitFor()
  assert.equal(tables.habits.size, 0)
  await screenshot('greeting-light')
  if (shots) {
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await screenshot('greeting-dark')
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
  }
  console.log('PASS email/magic-link screens and blank onboarding')

  const navigate = (name) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
  const newHabit = () => page.locator('header').getByRole('button', { name: 'New habit' }).click()
  const close = () => page.getByRole('button', { name: 'Close dialog' }).click()
  const synced = () => page.getByText('All changes synced', { exact: true }).waitFor()

  await newHabit()
  await page.getByLabel('Habit name').fill('Morning walk')
  await page.getByRole('button', { name: 'Create habit' }).click()
  await page.getByRole('button', { name: 'Complete Morning walk' }).click()
  await synced()
  await navigate('Calendar')
  const yesterday = page.locator('[data-date="2026-11-19"]')
  assert.match(await yesterday.getAttribute('aria-label'), /0 completed, 0 unfinished/)
  await yesterday.hover()
  await page.getByRole('tooltip').getByText('0 completed · 0 unfinished').waitFor()
  await yesterday.click()
  await page.getByText('No scheduled habits or check-ins on this date.').waitFor()
  await close()
  await navigate('Habits')
  await page.getByRole('button', { name: /Morning walk.*Every day/ }).click()
  await page.getByRole('button', { name: 'Previous month' }).click()
  await page.getByRole('heading', { name: 'October 2026' }).waitFor()
  await page.getByRole('button', { name: 'Next month' }).click()
  await page.getByRole('button', { name: /Thursday, November 19, 2026, No check-in/ }).click()
  await close()
  await navigate('Calendar')
  assert.match(await yesterday.getAttribute('aria-label'), /1 completed, 0 unfinished/)
  await yesterday.click()
  await page.getByRole('button', { name: 'Complete Morning walk' }).click()
  await close()
  assert.match(await yesterday.getAttribute('aria-label'), /0 completed, 0 unfinished/)
  await screenshot('calendar-light')
  console.log('PASS temporal calendar counts, hover, daily inspection, and history backfill')

  await newHabit()
  await page.getByLabel('Habit name').fill('Read pages')
  await page.getByLabel('Schedule', { exact: true }).selectOption('weekly')
  await page.getByLabel('Tracking type').selectOption('numeric')
  await page.getByLabel('Goal per day').fill('20')
  await page.getByLabel('Unit').fill('pages')
  await page.getByLabel('Category', { exact: true }).selectOption('custom')
  await page.getByLabel('Custom category').fill('Learning')
  await page.getByLabel('Custom icon').fill('📚')
  await page.getByRole('button', { name: 'Create habit' }).click()
  await navigate('Today')
  await page.getByText('0/3 this week').waitFor()
  await page.getByRole('spinbutton', { name: 'Read pages amount' }).fill('12.5')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  assert.equal(await page.getByRole('progressbar', { name: 'Read pages progress' }).getAttribute('value'), '12.5')
  await navigate('Insights')
  const coach = page.getByRole('region', { name: 'Weekly Coach' })
  await coach.getByText('7.5 pages left to reach today’s goal.').waitFor()
  await coach.getByRole('button', { name: 'Open Read pages for today' }).click()
  await page.getByRole('dialog').getByRole('heading', { name: 'Read pages', exact: true }).waitFor()
  await close()
  await navigate('Today')
  await page.getByRole('spinbutton', { name: 'Read pages amount' }).fill('20')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByText('1/3 this week').waitFor()
  await newHabit()
  await page.getByLabel('Habit name').fill('Monday stretch')
  await page.getByLabel('Schedule', { exact: true }).selectOption('weekdays')
  await page.getByRole('button', { name: 'Wed', exact: true }).click()
  await page.getByRole('button', { name: 'Fri', exact: true }).click()
  await page.getByRole('button', { name: 'Create habit' }).click()
  assert.equal(await page.getByRole('button', { name: /Monday stretch/ }).count(), 0)
  await navigate('Habits')
  await page.getByRole('button', { name: /Monday stretch.*Mon/ }).waitFor()
  await page.getByRole('button', { name: 'Learning', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: /Morning walk.*Every day/ }).count(), 0)
  await page.getByRole('searchbox', { name: 'Search habits' }).fill('unknown')
  await page.getByText('No habits match your filters.').waitFor()
  await navigate('Insights')
  assert.equal(await page.getByRole('group', { name: 'Consistency for the last 90 days' }).getByRole('button').count(), 90)
  await page.getByRole('button', { name: 'Annual', exact: true }).click()
  assert.equal(await page.getByRole('group', { name: 'Consistency for the last 365 days' }).getByRole('button').count(), 365)
  await page.getByRole('heading', { name: 'Streak milestones' }).waitFor()
  for (const badge of ['7d', '30d', '100d']) await page.getByText(badge, { exact: true }).waitFor()
  await coach.getByText('You’re caught up on today’s scheduled habits.').waitFor()
  await page.getByRole('button', { name: 'Monthly', exact: true }).click()
  await page.getByRole('list', { name: 'Monthly completion rates' }).waitFor()
  await screenshot('insights-light')
  console.log('PASS weekly frequency, numeric progress, category filters, search, and monthly insights')

  await navigate('Today')
  failNextNote = true
  await page.getByRole('textbox', { name: 'Daily affirmation' }).fill('I keep showing up.')
  await page.getByRole('button', { name: 'Retry sync' }).waitFor()
  await page.getByRole('button', { name: 'Retry sync' }).click()
  await synced()
  await page.reload()
  await page.getByRole('heading', { name: 'Good morning, Avery.' }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Daily affirmation' }).inputValue(), 'I keep showing up.')
  assert.equal(tables.daily_affirmations.get('2026-11-20').body, 'I keep showing up.')
  console.log('PASS optimistic affirmation save, retry, session persistence, and cloud reload')

  failNextNote = true
  await page.getByRole('textbox', { name: 'Daily affirmation' }).fill('The journal survives a reload.')
  await page.getByRole('button', { name: 'Retry sync' }).waitFor()
  await page.evaluate((id) => {
    const prefix = 'hexis-outbox-v1:' + id + ':'
    localStorage.setItem(prefix + '0000-invalid', '{')
    localStorage.setItem(prefix + '0001-invalid', JSON.stringify({ readyAt: 0, action: { type: 'unknown' } }))
  }, user.id)
  await page.evaluate(() => {
    localStorage.setItem('hexis-outbox-v1:a-different-account:0001', JSON.stringify({
      action: { type: 'affirmation', day: '2026-11-20', body: 'Another account’s draft' }, readyAt: 0,
    }))
  })
  await page.reload()
  await synced()
  assert.equal(await page.getByRole('textbox', { name: 'Daily affirmation' }).inputValue(), 'The journal survives a reload.')
  assert.equal(tables.daily_affirmations.get('2026-11-20').body, 'The journal survives a reload.')
  assert.ok(await page.evaluate(() => localStorage.getItem('hexis-outbox-v1:a-different-account:0001')))
  assert.equal(await page.evaluate((id) => Object.keys(localStorage).some((key) => key.startsWith('hexis-outbox-v1:' + id + ':') && !key.endsWith('-invalid')), user.id), false)
  console.log('PASS durable pending writes replay after reload for their owning account')

  await page.evaluate(() => {
    localStorage.setItem('hexis-store-v1', JSON.stringify({ state: {
      habits: [{ id: 'legacy', name: 'Evening journal', icon: 'pen', category: 'mind', color: 'iris', targetPerWeek: 7, createdAt: '2026-11-17', archived: false }],
      completions: { legacy: ['2026-11-17', '2026-11-19'] },
      affirmations: { '2026-11-19': 'Write a little.' },
    }, version: 7 }))
  })
  await page.reload()
  await page.getByRole('button', { name: 'Import data', exact: true }).click()
  await page.getByText('Your backup was imported.').waitFor()
  assert.equal(tables.habits.size, 4)
  assert.equal(tables.daily_affirmations.get('2026-11-19').body, 'Write a little.')
  await page.getByRole('button', { name: /Evening journal.*Every day/ }).click()
  await page.getByRole('button', { name: 'Streak freeze' }).click()
  await page.getByRole('button', { name: /Wednesday, November 18, 2026, No check-in/ }).click()
  await page.getByRole('button', { name: /Wednesday, November 18, 2026, Frozen/ }).waitFor()
  assert.match(await page.locator('.history-summary').innerText(), /2\s+Current streak/)
  await close()
  await synced()
  console.log('PASS one-click legacy import and streak freeze')

  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await navigate('Today')
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  await screenshot('today-mobile-dark')
  await navigate('Calendar')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('heading', { name: 'Habit reminders' }).waitFor()
  await context.grantPermissions(['notifications'])
  await page.evaluate(() => {
    const original = ServiceWorkerRegistration.prototype.showNotification
    const NativeNotification = window.Notification
    ServiceWorkerRegistration.prototype.showNotification = async function () {
      ServiceWorkerRegistration.prototype.showNotification = original
      throw new Error('Temporary delivery failure')
    }
    window.Notification = new Proxy(NativeNotification, {
      construct() { window.Notification = NativeNotification; throw new Error('Fallback unavailable') },
    })
  })
  await page.getByLabel('Reminder time').fill('00:00')
  await page.getByRole('button', { name: 'Enable reminders' }).click()
  await page.getByText(/This browser could not show a notification/).waitFor()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return registration && (await registration.getNotifications()).some((notice) => notice.tag === 'hexis-daily-reminder')
  })
  await page.getByRole('button', { name: 'Turn off' }).click()
  await page.getByRole('button', { name: 'Import JSON backup' }).click()
  await page.getByLabel('Hexis backup file').setInputFiles({
    name: 'old-browser.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ state: { affirmations: { '2026-11-15': 'I can begin again.' } }, version: 7 })),
  })
  await page.getByRole('button', { name: 'Import data', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(tables.daily_affirmations.get('2026-11-15').body, 'I can begin again.')
  assert.equal(await page.getByRole('navigation').evaluate((nav) => nav.scrollWidth <= nav.clientWidth), true)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByText('Create your first habit to start tracking.').waitFor()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')

  await page.getByRole('button', { name: 'Quick-Start Templates' }).click()
  await page.getByRole('button', { name: 'Add Health & Hydration' }).click()
  await navigate('Today')
  await page.getByRole('heading', { name: 'Today’s Focus' }).waitFor()
  const walk = page.getByRole('button', { name: 'Complete Walk outside' })
  await walk.press('Space')
  assert.equal(await walk.getAttribute('aria-pressed'), 'true')
  await walk.press('Enter')
  await page.getByRole('button', { name: /Walk outside.*per week/ }).click()
  await page.getByRole('button', { name: 'Streak freeze' }).click()
  await page.getByRole('button', { name: /Friday, November 20, 2026, No check-in/ }).click()
  await close()
  await page.getByText('Frozen', { exact: true }).waitFor()
  await page.getByRole('spinbutton', { name: 'Drink water amount' }).fill('2')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByLabel('Reflection for Drink water').click()
  await page.getByRole('button', { name: 'Steady', exact: true }).click()
  await page.getByRole('textbox', { name: 'Daily note', exact: true }).fill('=Better, "one sip at a time"')
  await page.getByRole('button', { name: 'Save note', exact: true }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const [json] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON' }).click()])
  const exported = JSON.parse(await readFile(await json.path(), 'utf8'))
  const guestHabit = exported.habits.find((habit) => habit.name === 'Drink water')
  assert.equal(exported.logs[guestHabit.id]['2026-11-20'].note, '=Better, "one sip at a time"')
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()])
  assert.match(await readFile(await csv.path(), 'utf8'), /"'=Better, ""one sip at a time"""/)
  await close()
  await page.reload()
  await page.getByRole('progressbar', { name: 'Drink water progress' }).waitFor()
  assert.equal(await page.getByRole('progressbar', { name: 'Drink water progress' }).getAttribute('value'), '2')
  await page.getByRole('button', { name: 'Sign in or sign up' }).click()
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'hexis-guest-v1' && JSON.parse(value).mergeUserId && sessionStorage.getItem('claim-test') !== 'allow') {
        sessionStorage.setItem('claim-test', 'failed')
        throw new Error('Guest storage is read-only')
      }
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: 'Continue with GitHub' }).click()
  await page.getByRole('heading', { name: 'Good morning, Avery.' }).waitFor()
  assert.equal(await page.evaluate(() => sessionStorage.getItem('claim-test')), 'failed')
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('hexis-guest-v1')).journal.habits.length))
  await page.evaluate(() => sessionStorage.setItem('claim-test', 'allow'))
  await page.reload()
  await page.getByText('Your guest journal was merged.', { exact: false }).waitFor()
  const merged = tables.habit_logs.get(`guest-${guestHabit.id}:2026-11-20`)
  assert.equal(merged.note, '=Better, "one sip at a time"')
  assert.equal(merged.mood, 'steady')
  assert.equal(tables.habits.size, 6)
  assert.equal(await page.evaluate(() => localStorage.getItem('hexis-guest-v1')), null)
  await page.reload()
  await page.getByLabel('Reflection for Drink water').click()
  assert.equal(await page.getByRole('textbox', { name: 'Daily note', exact: true }).inputValue(), '=Better, "one sip at a time"')
  await navigate('Calendar')
  const priorDay = page.locator('[data-date="2026-11-18"]')
  const priorCounts = await priorDay.getAttribute('aria-label')
  await navigate('Habits')
  await page.getByRole('button', { name: 'Archive Evening journal', exact: true }).click()
  await synced()
  await page.getByRole('button', { name: 'Archived', exact: true }).click()
  await page.getByRole('button', { name: 'Restore Evening journal', exact: true }).waitFor()
  await navigate('Calendar')
  assert.equal(await priorDay.getAttribute('aria-label'), priorCounts)
  await page.clock.setFixedTime(new Date('2026-11-22T09:30:00+08:00'))
  await page.reload()
  await synced()
  await navigate('Calendar')
  const pausedDay = page.locator('[data-date="2026-11-21"]')
  const pausedCounts = await pausedDay.getAttribute('aria-label')
  await navigate('Habits')
  await page.getByRole('button', { name: 'Archived', exact: true }).click()
  await page.getByRole('button', { name: 'Restore Evening journal', exact: true }).click()
  await synced()
  const restored = [...tables.habits.values()].find((habit) => habit.name === 'Evening journal')
  assert.deepEqual(restored.archive_periods, [{ start: '2026-11-20', end: '2026-11-22' }])
  await navigate('Today')
  await page.getByRole('button', { name: 'Complete Evening journal', exact: true }).waitFor()
  await navigate('Calendar')
  assert.equal(await pausedDay.getAttribute('aria-label'), pausedCounts)
  console.log('PASS archive and restore across reloads without rewriting calendar history')
  await navigate('Habits')
  await page.getByRole('button', { name: /Evening journal.*Every day/ }).click()
  await page.getByRole('button', { name: 'Edit details', exact: true }).click()
  await page.getByLabel('Habit name').fill('Evening reflection')
  await page.getByRole('button', { name: 'Cobalt', exact: true }).click()
  await page.getByRole('button', { name: 'Save details', exact: true }).click()
  await synced()
  const renamed = tables.habits.get(restored.id)
  assert.equal(renamed.name, 'Evening reflection')
  assert.equal(renamed.color, 'cobalt')
  assert.equal(renamed.schedule_type, restored.schedule_type)
  assert.deepEqual(renamed.archive_periods, restored.archive_periods)
  console.log('PASS habit details editing preserves the schedule and archive history')
  await page.keyboard.press('Control+k')
  const commands = page.getByRole('combobox', { name: 'Search pages, habits, or actions' })
  await commands.fill('Evening reflection')
  await commands.press('Enter')
  await page.getByRole('heading', { name: 'Evening reflection', exact: true }).waitFor()
  await close()
  await page.goto(new URL('?view=today', url).href)
  await page.getByRole('heading', { name: 'Today’s Focus', exact: true }).waitFor()
  console.log('PASS keyboard command search and direct Today shortcut')
  await page.getByRole('heading', { name: 'This week', exact: true }).waitFor()
  await page.getByRole('progressbar', { name: 'Walk outside weekly target' }).waitFor()
  await page.getByRole('button', { name: /Friday, November 20, 2026, / }).click()
  await page.getByRole('heading', { name: 'Friday, November 20, 2026', exact: true }).waitFor()
  await close()
  console.log('PASS weekly outlook, flexible targets and calendar drill-down')
  const sourceId = crypto.randomUUID()
  const restore = structuredClone(exported)
  restore.habits.push({
    ...guestHabit, id: sourceId, name: 'Saved water goal', archived: true,
    archivePeriods: [{ start: '2026-11-21', end: null }],
  })
  restore.logs[sourceId] = {
    ...restore.logs[guestHabit.id],
    '2026-11-21': { value: 0, frozen: true },
  }
  const importFile = (data) => page.getByLabel('Hexis backup file').setInputFiles({
    name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
  })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Import JSON backup' }).click()
  await importFile({ ...restore, version: 2 })
  await page.getByText('This Hexis backup version is unsupported.').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Import data', exact: true }).isDisabled(), true)
  await importFile({ ...restore, logs: { ...restore.logs, [sourceId]: { '2026-11-20': { value: 'broken' } } } })
  await page.getByText(/backup contains invalid Hexis records/).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Import data', exact: true }).isDisabled(), true)
  await importFile(restore)
  await page.getByText(/3 habits.*2 numeric.*1 archived/).waitFor()
  await page.getByRole('button', { name: 'Import data', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(tables.habits.size, 7)
  const saved = [...tables.habits.values()].find(({ name }) => name === 'Saved water goal')
  assert.equal(saved.kind, 'numeric')
  assert.equal(saved.goal, guestHabit.goal)
  assert.deepEqual(saved.archive_periods, restore.habits.at(-1).archivePeriods)
  assert.equal(tables.habit_logs.get(saved.id + ':2026-11-20').note, '=Better, "one sip at a time"')
  assert.equal(tables.habit_logs.get(saved.id + ':2026-11-21').frozen, true)
  console.log('PASS modern JSON restore preserves numeric goals, archive history, and reflections')

  assert.deepEqual(errors, [])
  console.log('PASS mobile layout, reminders, file import, guest templates, keyboard check-ins, reflections, exports, and OAuth guest merge')
} finally {
  await browser?.close()
  await server.close()
}
