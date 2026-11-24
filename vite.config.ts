import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function installableShell(): Plugin {
  return {
    name: 'hexis-app-shell',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const worker = readFileSync(new URL('./pwa/app-worker.js', import.meta.url), 'utf8')
      const publicAssets = ['favicon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest', 'reminder-worker.js']
      const assets = ['./', ...publicAssets, ...Object.keys(bundle).filter((path) => path.startsWith('assets/')).sort()]
      const revision = createHash('sha256').update(worker).update(JSON.stringify(assets))
        .update(readFileSync(new URL('./index.html', import.meta.url)))
      for (const file of publicAssets) revision.update(readFileSync(new URL(`./public/${file}`, import.meta.url)))
      this.emitFile({
        type: 'asset', fileName: 'app-worker.js',
        source: `const shellVersion = ${JSON.stringify(revision.digest('hex').slice(0, 16))}\nconst shellAssets = ${JSON.stringify(assets)}\n${worker}`,
      })
    },
  }
}

export default defineConfig({
  base: process.env.HEXIS_BASE_PATH ?? '/',
  plugins: [react(), installableShell()],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
  },
})
