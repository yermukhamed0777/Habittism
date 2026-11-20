import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('https://fonts.**/*', (route) => route.abort())
  // Serve the compiled assets directly through Playwright, including in offline CI.
  await page.route('https://habittism.test/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const asset = new URL('./dist' + (path === '/' ? '/index.html' : path), import.meta.url)
    await route.fulfill({ path: fileURLToPath(asset) })
  })
  await page.goto('https://habittism.test/')
  await page.getByText('No habits yet', { exact: true }).waitFor()
  const editor = page.getByRole('textbox', { name: "Today's affirmation" })
  await editor.fill('One step today.')
  await page.reload()
  await editor.waitFor()
  assert.equal(await editor.inputValue(), 'One step today.')
  await page.getByRole('button', { name: 'Create a habit', exact: true }).click()
  await page.getByPlaceholder('e.g. Morning meditation').fill('Read optics')
  await page.getByRole('button', { name: 'Create habit', exact: true }).click()
  await page.getByRole('button', { name: 'Open dashboard' }).click()
  const openHabit = page.getByRole('button', { name: 'Open Read optics and choose completed days' })
  await openHabit.click()
  const dialog = page.getByRole('dialog', { name: 'Read optics' })
  await dialog.getByRole('button', { name: 'Previous month' }).click()
  const day = dialog.locator('button[aria-pressed]:enabled').first()
  const dateKey = await day.getAttribute('aria-label')
  await day.click()
  assert.equal(await day.getAttribute('aria-pressed'), 'true')
  await page.keyboard.press('Escape')
  const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const cell = page.getByRole('button', { name: dateLabel + ' \u2014 1 of 1 completed', exact: true })
  await cell.hover()
  const tip = page.getByRole('tooltip')
  assert.match(await tip.innerText(), /1\s+done/)
  assert.match(await tip.innerText(), /0\s+not done/)
  await cell.click()
  await page.getByRole('dialog').getByRole('button', { name: /Read optics.*Done/i }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: dateLabel + ' \u2014 0 of 0 completed', exact: true }).waitFor()

  // Reopen a legacy profile containing both a real habit and a seeded one.
  await page.evaluate(() => {
    const key = 'habittism-store-v1'
    const snapshot = JSON.parse(localStorage.getItem(key))
    snapshot.version = 6
    snapshot.state.habits.push({ ...snapshot.state.habits[0], id: 'h-read', name: 'Read 20 pages' })
    snapshot.state.completions['h-read'] = ['2025-11-10']
    snapshot.state.completions[snapshot.state.habits[0].id] = ['2025-11-11']
    localStorage.setItem(key, JSON.stringify(snapshot))
  })
  await page.reload()
  await editor.waitFor()
  assert.equal(await editor.inputValue(), 'One step today.')
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('habittism-store-v1')).state)
  assert.deepEqual(state.habits.map((h) => h.name), ['Read optics'])
  assert.deepEqual(state.completions, { [state.habits[0].id]: ['2025-11-11'] })
  assert.deepEqual(errors, [])
  console.log('Passed greeting, persistence, empty start, creation, historical editing, calendar details and legacy migration.')
} finally {
  await browser.close()
}



