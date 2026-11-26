import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

// Deterministic demo capture: the browser suite drives the whole guest and
// account flow against fixed fixtures and writes one screenshot per step.
// A human can turn the PNG sequence into a narrated recording for the CV.
mkdirSync('shots', { recursive: true })
process.env.HEXIS_TEST_SCREENSHOTS = 'shots'
const result = spawnSync(process.execPath, ['e2e.mjs'], { stdio: 'inherit', env: process.env })
process.exit(result.status ?? 1)
