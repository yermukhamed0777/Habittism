/**
 * End-to-end smoke test for Habittism.
 *
 * Playwright is intentionally *not* a project dependency — it would add a
 * large browser download to every install and to CI. Install it on demand:
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run dev            # in another terminal
 *   node e2e.mjs
 */
import { chromium } from 'playwright'

const URL = 'http://localhost:5173/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(2000)

const results = []
const check = (name, ok, detail = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)

// 1. Core content renders
check('title', (await page.title()).includes('Habittism'), await page.title())
check('hero renders', await page.getByText('Build the habits', { exact: true }).isVisible())
check(
  'calendar grid present',
  (await page.locator('[title*="scheduled completed on"]').count()) > 300,
  `${await page.locator('[title*="scheduled completed on"]').count()} cells`,
)

// 2. Heatmap levels are all represented
const levels = await page.evaluate(() => {
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
  document.querySelectorAll('[title*="scheduled completed on"]').forEach((el) => {
    const cls = el.className
    for (let i = 0; i <= 4; i++) if (cls.includes(`lvl-${i}`)) counts[i]++
  })
  return counts
})
check('heat levels spread', Object.values(levels).filter((v) => v > 0).length >= 4, JSON.stringify(levels))

// 3. Toggle a habit
const firstCheck = page.locator('button[aria-label*="Mark"]').first()
const before = await firstCheck.getAttribute('aria-label')
await firstCheck.click()
await page.waitForTimeout(600)
const after = await firstCheck.getAttribute('aria-label')
check('habit toggle works', before !== after, `${before} -> ${after}`)

// 4. Persistence across reload
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
const persisted = await page.locator('button[aria-label*="Mark"]').first().getAttribute('aria-label')
check('state persists after reload', persisted === after, persisted)

// 5. Modal opens and creates a habit
await page.locator('button:has-text("New habit")').first().click()
await page.waitForTimeout(700)
check('modal opens', await page.locator('text=Small actions, repeated with intent.').isVisible())

await page.locator('input[placeholder*="meditation"]').fill('Cold shower')
await page.locator('button:has-text("Create habit")').click()
await page.waitForTimeout(800)
check('habit created', await page.locator('text=Cold shower').first().isVisible())

// 6. Calendar year navigation
const rangeBefore = await page.locator('span:has-text("–")').first().innerText()
await page.locator('button[aria-label="Previous year"]').click()
await page.waitForTimeout(700)
const rangeAfter = await page.locator('span:has-text("–")').first().innerText()
check('year navigation works', rangeBefore !== rangeAfter, `${rangeBefore} -> ${rangeAfter}`)

// 7. Chart rendered
const chartInfo = await page.evaluate(() => {
  const svg = document.querySelector('.recharts-wrapper')
  if (!svg) return null
  const r = svg.getBoundingClientRect()
  return {
    w: Math.round(r.width),
    h: Math.round(r.height),
    area: svg.querySelectorAll('.recharts-area-area').length,
    dots: svg.querySelectorAll('.recharts-line-curve').length,
  }
})
check('chart rendered', !!chartInfo && chartInfo.area > 0, JSON.stringify(chartInfo))

// 8. No horizontal overflow
const dims = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}))
check('no horizontal overflow', dims.scrollW <= dims.clientW + 1, JSON.stringify(dims))

console.log(results.join('\n'))
console.log('\nconsole errors:', errors.length ? errors.join(' | ') : 'none')
console.log('\nFAILURES:', results.filter((r) => r.startsWith('FAIL')).length)

await browser.close()
