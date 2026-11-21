import { createClient } from '@supabase/supabase-js'

// Simple in-memory sliding window rate limiter per user: 10 requests per hour
const userRateLimits = new Map<string, number[]>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const limit = 10
  const timestamps = (userRateLimits.get(userId) ?? []).filter((t) => now - t < windowMs)
  if (timestamps.length >= limit) return false
  timestamps.push(now)
  userRateLimits.set(userId, timestamps)
  return true
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // 1. Verify Supabase session token
  const authHeader = req.headers.authorization ?? req.headers.Authorization
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sign in to request an AI habit coach suggestion.' })
  }

  const token = authHeader.slice(7).trim()
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  let userId: string | null = null
  if (supabaseUrl && supabaseAnon) {
    try {
      const client = createClient(supabaseUrl, supabaseAnon)
      const { data: { user }, error } = await client.auth.getUser(token)
      if (error || !user) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired session.' })
      }
      userId = user.id
    } catch {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Could not verify session.' })
    }
  } else {
    userId = 'authenticated-user'
  }

  // 2. Enforce per-user rate limit
  if (userId && !checkRateLimit(userId)) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Coach suggestion limit reached (10/hr). Try again later.',
    })
  }

  // 3. Validate bounded input payload
  const body = req.body ?? {}
  const { habitsCount, completedCount, plannedCount, rate, topCategory } = body

  if (
    typeof habitsCount !== 'number' || habitsCount < 0 || habitsCount > 1000 ||
    typeof completedCount !== 'number' || completedCount < 0 || completedCount > 10000 ||
    typeof plannedCount !== 'number' || plannedCount < 0 || plannedCount > 10000 ||
    typeof rate !== 'number' || rate < 0 || rate > 100 ||
    typeof topCategory !== 'string' || topCategory.length > 50
  ) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'Payload must only contain bounded aggregate statistics.' })
  }

  // 4. Check server-side provider key
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(200).json({
      available: false,
      message: 'AI provider is not configured. Enjoy your deterministic weekly summary!',
    })
  }

  // 5. Call LLM provider with strict bounded schema and timeout
  try {
    const prompt = `You are a calm, grounded habit coach. Given these aggregate statistics from this week:
- Active habits: ${habitsCount}
- Scheduled goals: ${plannedCount}
- Completed goals: ${completedCount}
- Overall consistency: ${rate}%
- Main focus area: ${topCategory}

Return ONLY valid JSON with exactly two fields:
{
  "observation": "A concise observation about consistency (max 120 characters)",
  "adjustment": "One realistic, actionable adjustment for next week (max 140 characters)"
}`

    if (process.env.GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) {
        return res.status(200).json({ available: false, fallback: true, message: 'Provider unavailable.' })
      }

      const json = await response.json()
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
      const parsed = JSON.parse(rawText)
      const observation = typeof parsed.observation === 'string' ? parsed.observation.slice(0, 150) : null
      const adjustment = typeof parsed.adjustment === 'string' ? parsed.adjustment.slice(0, 180) : null

      if (!observation || !adjustment) {
        return res.status(200).json({ available: false, fallback: true })
      }

      return res.status(200).json({ available: true, observation, adjustment })
    }

    return res.status(200).json({ available: false, fallback: true })
  } catch (err: any) {
    return res.status(200).json({ available: false, fallback: true, error: err?.message || 'Timeout' })
  }
}
