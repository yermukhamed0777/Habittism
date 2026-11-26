import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

// Read-only probes against the deployed releases. No sign-in, no writes, no
// journal content. Local asset hashes are compared with what the CDN serves.
const targets = {
  vercel: process.env.HEXIS_LIVE_URL ?? 'https://habittism.vercel.app/',
  pages: process.env.HEXIS_PAGES_URL ?? 'https://yermukhamed0777.github.io/Hexis/',
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
const get = async (path, origin = targets.vercel) => {
  const response = await fetch(new URL(path, origin), { cache: 'no-store' })
  const body = Buffer.from(await response.arrayBuffer())
  return { status: response.status, body, headers: response.headers, text: body.toString('utf8') }
}
const check = (name, ok, detail) => {
  assert.ok(ok, `${name}: ${detail}`)
  console.log(`PASS  ${name} — ${detail}`)
}

const home = await get('/')
check('production homepage', home.status === 200 && home.text.includes('Hexis'), 'HTTP 200 with the Hexis shell')
const csp = home.headers.get('content-security-policy') ?? ''
check('production CSP', csp.includes("default-src 'none'") && csp.includes('connect-src'), 'Vercel CSP header present with restricted defaults')

const manifest = await get('manifest.webmanifest')
check('install manifest', manifest.status === 200 && JSON.parse(manifest.text).display === 'standalone', 'standalone display')

const worker = await get('app-worker.js')
check('app worker', worker.status === 200 && worker.text.includes('shellAssets'), 'generated shell worker served')

const today = await get('?view=today')
check('Today shortcut', today.status === 200 && today.text.includes('Hexis'), 'in-page route returns the shell')

const asset = home.text.match(/src="(\/assets\/[^"]+\.js)"/)?.[1]
assert.ok(asset, 'homepage references a hashed JS asset')
const remoteAsset = await get(asset.replace(/^\//, ''))
// Vercel injects Supabase environment values into the bundle, so its JS hash
// is intentionally different from a credential-free local build.
check('served JS bundle', remoteAsset.status === 200 && remoteAsset.text.includes('hexis-outbox-v1'), `${asset} served with the durable outbox marker`)

const css = home.text.match(/href="(\/assets\/[^"]+\.css)"/)?.[1]
if (css) {
  const remoteCss = await get(css.replace(/^\//, ''))
  const localCss = await readFile(`dist${css}`)
  check('served CSS matches local build', remoteCss.status === 200 && sha256(remoteCss.body) === sha256(localCss), `sha256 ${sha256(localCss).slice(0, 12)}`)
}

const pages = await get('', targets.pages)
check('GitHub Pages release', pages.status === 200 && pages.text.includes('Hexis'), 'subpath release serves the shell')

console.log('Live checks passed; no account or journal content was used.')
