import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { preview } from 'vite'

const server = await preview({ logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } })
let browser

try {
  browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  const url = server.resolvedUrls.local[0]
  await page.goto(url)
  await page.getByText('Try Habittism as a guest').waitFor()
  await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/app-worker.js'))

  const manifest = await (await context.request.get(new URL('manifest.webmanifest', url).href)).json()
  assert.equal(manifest.display, 'standalone')
  assert.ok(manifest.shortcuts.some((shortcut) => shortcut.url === './?view=today'))
  for (const icon of manifest.icons) {
    const dimensions = await page.evaluate(async (src) => {
      const image = new Image()
      image.src = src
      await image.decode()
      return `${image.naturalWidth}x${image.naturalHeight}`
    }, new URL(icon.src, url).href)
    assert.equal(dimensions, icon.sizes)
  }

  await page.getByRole('button', { name: 'Install app', exact: true }).click()
  await page.getByRole('heading', { name: 'Install Habittism', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await page.getByRole('textbox', { name: 'Daily affirmation' }).fill('Keep going, even offline.')
  await context.setOffline(true)
  await page.goto(new URL('?view=today', url).href)
  await page.getByRole('heading', { name: 'Today’s Focus', exact: true }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Daily affirmation' }).inputValue(), 'Keep going, even offline.')

  const cached = await page.evaluate(async () => {
    const entries = await Promise.all((await caches.keys()).map(async (name) => (await caches.open(name)).keys()))
    return entries.flat().map(({ url }) => url)
  })
  assert.ok(cached.some((asset) => asset.includes('/assets/') && asset.endsWith('.js')))
  assert.ok(cached.every((asset) => new URL(asset).origin === new URL(url).origin))
  assert.ok(cached.every((asset) => !new URL(asset).search))
  console.log('PASS install metadata, app icons, offline guest journal, and static-only caching')
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
