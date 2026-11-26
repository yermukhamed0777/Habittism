import { spawnSync } from 'node:child_process'
import { build } from 'vite'

// Cross-platform helper for the GitHub Pages (subpath) build. CI uses the
// same command locally and in automation, so the two cannot drift.
process.env.HEXIS_BASE_PATH = '/Hexis/'
const command = process.argv[2] ?? 'verify'

if (command === 'build' || command === 'verify') {
  await build({ build: { outDir: 'dist-pages' } })
}

if (command === 'test' || command === 'verify') {
  process.env.HEXIS_DIST = 'dist-pages'
  const result = spawnSync(process.execPath, ['test/pwa.mjs'], { stdio: 'inherit', env: process.env })
  process.exit(result.status ?? 1)
}
