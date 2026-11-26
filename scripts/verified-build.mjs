// Vercel production builds wait for GitHub CI on this exact push to main.
import { setTimeout as delay } from 'node:timers/promises'

if (process.env.VERCEL_ENV === 'production') {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Production needs a Git commit SHA')
  const url = new URL('https://api.github.com/repos/yermukhamed0777/Hexis/actions/workflows/ci.yml/runs')
  url.search = new URLSearchParams({ head_sha: sha, branch: 'main', event: 'push', per_page: '1' }).toString()
  const deadline = Date.now() + 12 * 60_000
  for (;;) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error('Cannot verify GitHub CI: HTTP ' + response.status)
    const { workflow_runs: [run] } = await response.json()
    if (run?.head_sha === sha && run.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error('GitHub CI: ' + run.conclusion)
      break
    }
    if (Date.now() >= deadline) throw new Error('Timed out waiting for GitHub CI')
    await delay(30_000)
  }
}
