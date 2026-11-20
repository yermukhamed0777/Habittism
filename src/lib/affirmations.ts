/**
 * Starter lines for the daily affirmation. The user can pick one as a
 * springboard, or ignore them entirely and write their own.
 */
export const AFFIRMATION_PROMPTS: string[] = [
  'I show up for myself today, even if it is imperfect.',
  'Today I choose progress over perfection.',
  'Small actions, repeated, become who I am.',
  'I am allowed to be a work in progress.',
  'I trust the version of me that follows through.',
  'Every day I keep a promise to myself, I grow stronger.',
  'I do not need motivation — I only need a beginning.',
  'I make space for what matters and let the rest go.',
  'I am proud of the quiet consistency no one else can see.',
  'Today, I choose calm over hurry.',
  'I carry yesterday’s effort into today.',
  'I am building something that lasts.',
]

/** A prompt that hasn't been suggested recently, so the list feels fresh. */
export function pickPrompt(exclude?: string): string {
  const pool = AFFIRMATION_PROMPTS.filter((p) => p !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Time-of-day greeting used on the greeting screen. */
export function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 5) return 'Still awake'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 22) return 'Good evening'
  return 'Winding down'
}
