import { motion } from 'motion/react'
import { Flame, Target, Trophy } from 'lucide-react'
import { GlassPanel } from './GlassPanel'

interface HeroProps {
  name: string
  streak: number
  bestStreak: number
  todayLabel: string
  doneToday: number
  totalToday: number
}

export function Hero({
  name,
  streak,
  bestStreak,
  todayLabel,
  doneToday,
  totalToday,
}: HeroProps) {
  return (
    <GlassPanel className="relative overflow-hidden !rounded-[28px]" sheen>
      {/* Internal glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-32 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.34)_0%,transparent_68%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-[18%] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22)_0%,transparent_70%)] blur-3xl"
      />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:p-10">
        {/* Copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="chip !border-aqua-300/25 !bg-aqua-400/10 text-aqua-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-aqua-300 shadow-[0_0_8px_var(--color-aqua-400)]" />
            {todayLabel}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-[2.9rem]"
          >
            <span className="text-gradient">Build the habits</span>
            <br />
            <span className="text-gradient-soft">that build you.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6 }}
            className="mt-4 max-w-md text-[0.92rem] leading-relaxed text-mist-400"
          >
            Welcome back, <span className="font-semibold text-mist-200">{name}</span>. You have
            completed{' '}
            <span className="font-semibold text-mist-100">
              {doneToday} of {totalToday}
            </span>{' '}
            scheduled habits today. Consistency is a system — here is your proof.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6 }}
            className="mt-6 flex flex-wrap gap-2.5"
          >
            <span className="chip !border-rose-300/25 !bg-rose-400/10 text-rose-200">
              <Flame size={12} strokeWidth={2.4} />
              {streak} day streak
            </span>
            <span className="chip !border-violet-300/25 !bg-violet-400/10 text-violet-200">
              <Trophy size={12} strokeWidth={2.4} />
              Best {bestStreak} days
            </span>            <span className="chip !border-emerald-300/25 !bg-emerald-400/10 text-emerald-200">
              <Target size={12} strokeWidth={2.4} />
              {Math.max(0, totalToday - doneToday)} remaining
            </span>
          </motion.div>
        </div>

        {/* Streak dial */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center lg:justify-end"
        >
          <div className="relative grid h-[190px] w-[190px] place-items-center">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full bg-[conic-gradient(from_140deg,var(--color-iris-500),var(--color-aqua-400),var(--color-mint-400),var(--color-iris-500))] opacity-80 blur-[2px]"
              style={{ maskImage: 'radial-gradient(circle, transparent 58%, #000 59%)' }}
            />
            <div
              aria-hidden
              className="absolute inset-[3px] rounded-full bg-ink-900/85 backdrop-blur-xl"
              style={{ maskImage: 'radial-gradient(circle, transparent 58%, #000 59%)' }}
            />
            <div className="relative text-center">
              <p className="text-[3.4rem] font-extrabold leading-none tracking-tight text-mist-100 tabular">
                {streak}
              </p>
              <p className="mt-1.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-mist-500">
                day streak
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </GlassPanel>
  )
}
