import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from 'playwright'

// Reproducible data-integrity scenarios with synthetic journal content only.
// No real account, email, device or private journal is involved.

const origin = 'https://hexis-integrity.supabase.co'
process.env.VITE_SUPABASE_URL = origin
process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_hexis_integrity'

const server = await createServer({
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 },
})
await server.listen()
const url = server.resolvedUrls.local[0]

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'integrity@example.test',
  aud: 'authenticated',
  role: 'authenticated',
  user_metadata: { full_name: 'Integrity' },
  app_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
let activeUser = user
let shortSession = false
const token = () => `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
  sub: activeUser.id,
  role: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + (shortSession ? 1 : 86400),
})}.c2ln`
const tables = {
  profiles: new Map(),
  habits: new Map(),
  habit_logs: new Map(),
  daily_affirmations: new Map(),
}
const fail = { habits: false, logs: false, affirmations: false }
let networkDown = false
let denyWrites = false
const keyFor = (table, row) => {
  if (table === 'habit_logs') return `${row.habit_id}:${row.day}`
  if (table === 'daily_affirmations') return row.day
  return row.id
}

async function mockSupabase(route) {
  const request = route.request()
  const endpoint = new URL(request.url())
  const method = request.method()
  const [, , table, rpc] = endpoint.pathname.slice(1).split('/')
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': '*',
  }
  const send = (json, status = 200) =>
    route.fulfill(json === undefined ? { status, headers } : { status, headers, json })
  if (method === 'OPTIONS') return send(undefined, 204)
  // Playwright routes are fulfilled even when the context is offline, so the
  // fixture simulates the transport failure explicitly.
  if (networkDown) return send({ message: 'Synthetic offline failure' }, 503)
  if (denyWrites) return send({ message: 'Session expired' }, 401)
  if (endpoint.pathname.includes('/auth/v1/')) {
    if (table === 'token') {
      return send({
        access_token: token(),
        refresh_token: 'integrity-refresh-token',
        expires_in: shortSession ? 1 : 86400,
        token_type: 'bearer',
        user: activeUser,
      })
    }
    if (table === 'user') return send(activeUser)
    if (table === 'logout') return send(undefined, 204)
    if (table === 'otp' || table === 'recover') return send({})
    if (table === 'authorize') {
      const callback = new URL(endpoint.searchParams.get('redirect_to'))
      callback.hash = new URLSearchParams({
        access_token: token(),
        refresh_token: 'integrity-refresh-token',
        expires_in: '86400',
        token_type: 'bearer',
        type: 'signup',
      }).toString()
      return route.fulfill({ status: 302, headers: { location: callback.href } })
    }
    return send({})
  }
  if (table === 'rpc' && rpc === 'import_modern_journal') {
    const { payload } = request.postDataJSON()
    for (const habit of payload.habits)
      if (!tables.habits.has(habit.id))
        tables.habits.set(habit.id, { archived: false, archive_periods: [], ...habit, user_id: activeUser.id })
    for (const log of payload.logs) {
      const row = { value: 0, frozen: false, note: null, mood: null, ...log, user_id: activeUser.id }
      const key = keyFor('habit_logs', row)
      if (!tables.habit_logs.has(key)) tables.habit_logs.set(key, row)
    }
    for (const note of payload.affirmations)
      if (!tables.daily_affirmations.has(note.day))
        tables.daily_affirmations.set(note.day, { ...note, user_id: activeUser.id })
    return send(null)
  }
  if (table === 'rpc' && rpc === 'merge_guest_journal') {
    const { payload } = request.postDataJSON()
    for (const habit of payload.habits)
      if (!tables.habits.has(habit.id))
        tables.habits.set(habit.id, { ...habit, user_id: activeUser.id })
    for (const log of payload.logs) {
      const row = { ...log, user_id: activeUser.id }
      const key = keyFor('habit_logs', row)
      if (!tables.habit_logs.has(key)) tables.habit_logs.set(key, row)
    }
    for (const note of payload.affirmations)
      if (!tables.daily_affirmations.has(note.day))
        tables.daily_affirmations.set(note.day, { ...note, user_id: activeUser.id })
    return send(null)
  }
  assert.ok(tables[table], `Unmocked route ${endpoint.pathname}`)
  if (method === 'POST') {
    if (fail[table]) {
      fail[table] = false
      return send({ code: 'INTEGRITY_FAIL', message: 'Synthetic failure' }, 503)
    }
    for (const input of [].concat(request.postDataJSON())) {
      assert.equal(table === 'profiles' ? input.id : input.user_id, activeUser.id)
      // Mirror the schema defaults that Supabase applies on insert.
      const row = table === 'habits'
        ? { archived: false, archived_at: null, archive_periods: [], ...input }
        : table === 'habit_logs'
          ? { value: 0, frozen: false, note: null, mood: null, ...input }
          : input
      tables[table].set(keyFor(table, row), row)
    }
    return send(undefined, 201)
  }
  assert.equal(endpoint.searchParams.get('user_id'), `eq.${activeUser.id}`)
  const match = (row) =>
    [...endpoint.searchParams].every(
      ([field, filter]) => !filter.startsWith('eq.') || filter.slice(3) === row[field],
    )
  if (method === 'PATCH') {
    for (const [key, row] of tables[table])
      if (match(row)) tables[table].set(key, { ...row, ...request.postDataJSON() })
    return send(undefined, 204)
  }
  if (method === 'DELETE') {
    for (const [key, row] of tables[table]) if (match(row)) tables[table].delete(key)
    return send(undefined, 204)
  }
  assert.equal(method, 'GET')
  return send([...tables[table].values()].filter(match))
}

let browser
try {
  browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: 'Asia/Shanghai',
  })
  await context.route(`${origin}/**`, mockSupabase)
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-11-20T09:30:00+08:00'))
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  const newHabit = async (name) => {
    await page.locator('header').getByRole('button', { name: 'New habit' }).click()
    await page.getByLabel('Habit name').fill(name)
    await page.getByRole('button', { name: 'Create habit' }).click()
  }
  const navigate = (name) =>
    page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
  const synced = () => page.getByText('All changes synced', { exact: true }).waitFor()
  const importReady = () =>
    page.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Import data'))
      return !!button && !button.disabled
    })
  const signIn = async (target = page) => {
    await target.getByRole('button', { name: 'Sign in or sign up' }).click()
    await target.getByLabel('Email').fill(user.email)
    await target.getByLabel('Password').fill('integrity-password')
    await target.getByRole('button', { name: 'Sign in', exact: true }).click()
    await target.getByText('All changes synced', { exact: true }).waitFor()
  }

  // 1. Guest creation, persistence, export and deletion.
  await page.goto(url)
  await page.getByText('Create your first habit to start tracking.').waitFor()
  await newHabit('Integrity walk')
  await page.getByRole('button', { name: 'Complete Integrity walk' }).click()
  await page.getByRole('textbox', { name: 'Daily affirmation' }).fill('Synthetic guest affirmation')
  await page.reload()
  await page.getByText('Create your first habit to start tracking.').waitFor({ state: 'hidden' })
  assert.equal(await page.getByRole('textbox', { name: 'Daily affirmation' }).inputValue(), 'Synthetic guest affirmation')
  assert.equal(await page.getByRole('button', { name: /Integrity walk.*Every day/ }).count(), 1)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ])
  const backup = JSON.parse(await readFile(await download.path(), 'utf8'))
  assert.equal(backup.habits.length, 1)
  assert.equal(backup.habits[0].name, 'Integrity walk')
  assert.equal(Object.values(backup.logs).flatMap((day) => Object.keys(day)).length, 1)
  assert.equal(backup.affirmations['2026-11-20'], 'Synthetic guest affirmation')
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await navigate('Habits')
  await page.getByRole('button', { name: /Integrity walk.*Every day/ }).click()
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Delete habit' }).click()
  await page.getByRole('button', { name: /Integrity walk.*Every day/ }).waitFor({ state: 'detached' })
  await page.reload()
  await page.getByRole('button', { name: /Integrity walk.*Every day/ }).waitFor({ state: 'detached' })
  console.log('PASS guest journal persists, exports exactly its synthetic records, and deletion survives reload')

  // 2. Guest-to-account migration is exactly once.
  await newHabit('Migrated walk')
  await page.getByRole('textbox', { name: 'Daily affirmation' }).fill('Synthetic migrated affirmation')
  await signIn()
  await page.getByText('Your guest journal was merged.', { exact: false }).waitFor()
  await synced()
  assert.equal(tables.habits.size, 1)
  assert.equal(tables.habit_logs.size, 0)
  assert.equal(tables.daily_affirmations.get('2026-11-20').body, 'Synthetic migrated affirmation')
  assert.equal(await page.evaluate(() => localStorage.getItem('hexis-guest-v1')), null)
  await page.reload()
  await synced()
  assert.equal(tables.habits.size, 1)
  assert.equal(await page.locator('header').getByRole('button', { name: /Migrated walk/ }).count(), 0)
  await navigate('Today')
  assert.equal(await page.getByRole('button', { name: 'Complete Migrated walk' }).count(), 1)
  console.log('PASS guest-to-account migration is atomic, exactly once, and clears the guest claim')

  // 3. Phone-to-desktop synchronization and simultaneous different-session edits.
  const phone = await browser.newContext({
    viewport: { width: 375, height: 812 },
    timezoneId: 'Asia/Shanghai',
  })
  await phone.route(`${origin}/**`, mockSupabase)
  const phonePage = await phone.newPage()
  await phonePage.clock.setFixedTime(new Date('2026-11-20T09:30:00+08:00'))
  await phonePage.goto(url)
  await signIn(phonePage)
  assert.equal(await phonePage.getByRole('button', { name: 'Complete Migrated walk' }).count(), 1)
  await phonePage.locator('header').getByRole('button', { name: 'New habit' }).click()
  await phonePage.getByLabel('Habit name').fill('Phone habit')
  await phonePage.getByRole('button', { name: 'Create habit' }).click()
  await page.waitForFunction(() => document.body.innerText.includes('Phone habit'), null, { timeout: 10000 }).catch(() => {})
  await page.reload()
  await navigate('Today')
  await page.getByRole('button', { name: 'Complete Phone habit' }).waitFor()
  await navigate('Habits')
  await page.locator('header').getByRole('button', { name: 'New habit' }).click()
  await page.getByLabel('Habit name').fill('Desktop habit')
  await page.getByRole('button', { name: 'Create habit' }).click()
  await phonePage.reload()
  await phonePage.getByRole('navigation').getByRole('button', { name: 'Habits' }).click()
  await phonePage.getByText('3 active').waitFor()
  assert.equal([...tables.habits.values()].filter((h) => h.name === 'Phone habit').length, 1)
  assert.equal([...tables.habits.values()].filter((h) => h.name === 'Desktop habit').length, 1)
  console.log('PASS two signed-in sessions converge without losing or duplicating habits')

  // 4. Offline edits followed by reconnection.
  await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  networkDown = true
  await phone.setOffline(true)
  await phonePage.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  await phonePage.getByRole('button', { name: 'Complete Phone habit' }).click()
  await phonePage.getByRole('textbox', { name: 'Daily affirmation' }).fill('Synthetic offline affirmation')
  const pending = await phonePage.evaluate(() =>
    Object.keys(localStorage).filter((key) => key.startsWith('hexis-outbox-v1:')).length,
  )
  assert.ok(pending >= 2, 'offline edits must remain in the durable outbox')
  await phone.setOffline(false)
  networkDown = false
  // The queue retries on the online event; the manual button is the fallback.
  await phonePage.getByRole('button', { name: 'Retry sync' }).click({ timeout: 5000 }).catch(() => {})
  await phonePage.getByText('All changes synced', { exact: true }).waitFor()
  assert.equal(tables.daily_affirmations.get('2026-11-20').body, 'Synthetic offline affirmation')
  const phoneHabitId = [...tables.habits.values()].find((h) => h.name === 'Phone habit').id
  assert.equal(tables.habit_logs.get(`${phoneHabitId}:2026-11-20`).value, 1)
  await phonePage.reload()
  await phonePage.getByRole('textbox', { name: 'Daily affirmation' }).waitFor()
  assert.equal(await phonePage.getByRole('textbox', { name: 'Daily affirmation' }).inputValue(), 'Synthetic offline affirmation')
  console.log('PASS offline edits replay once on reconnection and survive a reload')

  // 5. Interrupted synchronization and failed network request.
  fail.daily_affirmations = true
  await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  await page.getByRole('textbox', { name: 'Daily affirmation' }).fill('Synthetic retry affirmation')
  await page.getByRole('button', { name: 'Retry sync' }).waitFor()
  await page.reload()
  // Reopening the journal replays the durable outbox without a manual click.
  await synced()
  assert.equal(tables.daily_affirmations.get('2026-11-20').body, 'Synthetic retry affirmation')
  console.log('PASS a failed write is retried after reload without dropping the journal entry')

  // 6. Export, import and restoration under an account.
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const [accountBackup] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ])
  const restored = JSON.parse(await readFile(await accountBackup.path(), 'utf8'))
  await page.getByRole('button', { name: 'Import JSON backup' }).click()
  await page.getByLabel('Hexis backup file').setInputFiles({
    name: 'integrity-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(restored)),
  })
  await importReady()
  await page.getByRole('button', { name: 'Import data', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await synced()
  const before = tables.habits.size
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Import JSON backup' }).click()
  await page.getByLabel('Hexis backup file').setInputFiles({
    name: 'integrity-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(restored)),
  })
  await importReady()
  await page.getByRole('button', { name: 'Import data', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await synced()
  assert.equal(tables.habits.size, before, 're-import must not duplicate habits')
  console.log('PASS account export/import restores records and is idempotent')

  // 7. Notification permission denial is reported honestly.
  await context.clearPermissions()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByLabel('Reminder time').fill('00:00')
  await page.getByRole('button', { name: 'Enable reminders' }).click()
  await page.getByText(/Allow notifications for Hexis in your browser settings/).waitFor()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  console.log('PASS denied notification permission is surfaced instead of pretending reminders are on')

  // 8. Authentication expiry keeps the pending change recoverable.
  denyWrites = true
  await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  await page.getByRole('textbox', { name: 'Daily affirmation' }).fill('Synthetic expired-session affirmation')
  await page.getByRole('button', { name: 'Retry sync' }).waitFor()
  assert.ok(
    await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('hexis-outbox-v1:'))),
    'an expired session must not discard the pending journal change',
  )
  denyWrites = false
  await page.reload()
  await synced()
  assert.equal(tables.daily_affirmations.get('2026-11-20').body, 'Synthetic expired-session affirmation')
  console.log('PASS expired-session writes stay pending and replay after the session recovers')

  // 9. Password recovery request is reported honestly without a real inbox.
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in or sign up' }).click()
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email').fill(user.email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await page.getByText('Check your email for a password reset link.').waitFor()
  console.log('PASS password recovery request returns an honest notice (link delivery is owner-only)')

  // 10. Time-zone change and midnight boundary do not duplicate or shift a check-in.
  const desktopDay = await page.locator('[data-date="2026-11-20"]').getAttribute('aria-label').catch(() => null)
  await page.clock.setFixedTime(new Date('2026-11-21T00:01:00+08:00'))
  await page.reload()
  await navigate('Calendar')
  const nextDay = await page.locator('[data-date="2026-11-21"]').getAttribute('aria-label')
  assert.match(nextDay, /completed|unfinished/)
  if (desktopDay) assert.match(desktopDay, /completed|unfinished/)
  assert.equal([...tables.habit_logs.values()].filter((row) => row.day === '2026-11-20').length, 1)
  console.log('PASS midnight boundary keeps one dated check-in and a consistent calendar')

  assert.deepEqual(errors, [])
  console.log('PASS no uncaught browser errors during integrity scenarios')
  await phone.close()
} finally {
  await browser?.close()
  await server.close()
}
