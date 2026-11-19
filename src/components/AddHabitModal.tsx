import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, X } from 'lucide-react'
import { GlassPanel } from './GlassPanel'
import { HabitIcon } from './HabitIcon'
import { ICON_CHOICES } from '../lib/icons'
import { CATEGORY_META, type HabitCategory, type HabitColor } from '../types'
import { cn } from '../lib/utils'

interface AddHabitModalProps {
  open: boolean
  onClose: () => void
  onCreate: (input: {
    name: string
    icon: string
    category: HabitCategory
    color: HabitColor
    targetPerWeek: number
  }) => void
}

const CATEGORIES: HabitCategory[] = ['mind', 'body', 'craft', 'social', 'system']
const COLORS: HabitColor[] = ['iris', 'aqua', 'mint', 'amber', 'rose']

const COLOR_HEX: Record<HabitColor, string> = {
  iris: '#a78bfa',
  aqua: '#22d3ee',
  mint: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
}

export function AddHabitModal({ open, onClose, onCreate }: AddHabitModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('target')
  const [category, setCategory] = useState<HabitCategory>('mind')
  const [color, setColor] = useState<HabitColor>('iris')
  const [target, setTarget] = useState(7)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate({ name: trimmed, icon, category, color, targetPerWeek: target })
    setName('')
    setIcon('target')
    setCategory('mind')
    setColor('iris')
    setTarget(7)
    onClose()
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/70 p-4 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg"
          >
            <GlassPanel className="overflow-hidden !rounded-3xl" sheen>
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-mist-100">New habit</h3>
                  <p className="mt-0.5 text-[0.76rem] text-mist-400">
                    Small actions, repeated with intent.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="grid h-8 w-8 place-items-center rounded-lg text-mist-400 transition-colors hover:bg-white/10 hover:text-mist-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-5 p-5">
                {/* Name */}
                <label className="flex flex-col gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-mist-500">
                    Habit name
                  </span>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submit()
                    }}
                    placeholder="e.g. Morning meditation"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm font-medium text-mist-100 outline-none transition-colors placeholder:text-mist-500 focus:border-aqua-400/50 focus:bg-white/[0.07]"
                  />
                </label>

                {/* Icon */}
                <div className="flex flex-col gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-mist-500">
                    Icon
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ICON_CHOICES.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setIcon(ic)}
                        className={cn(
                          'grid h-9 w-9 place-items-center rounded-xl border transition-all duration-250',
                          icon === ic
                            ? 'border-aqua-300/60 bg-aqua-400/15 text-aqua-300'
                            : 'border-white/10 bg-white/[0.04] text-mist-400 hover:border-white/20 hover:text-mist-200',
                        )}
                      >
                        <HabitIcon name={ic} size={15} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="flex flex-col gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-mist-500">
                    Category
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-[0.76rem] font-semibold transition-all duration-250',
                          category === c
                            ? 'border-white/25 bg-white/[0.12] text-mist-100'
                            : 'border-white/10 bg-white/[0.03] text-mist-400 hover:border-white/20 hover:text-mist-200',
                        )}
                      >
                        {CATEGORY_META[c].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="flex flex-col gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-mist-500">
                    Accent
                  </span>
                  <div className="flex gap-2.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={`${c} accent`}
                        className={cn(
                          'h-8 w-8 rounded-full border-2 transition-all duration-250',
                          color === c
                            ? 'scale-110 border-white/70'
                            : 'border-transparent hover:scale-105 hover:border-white/25',
                        )}
                        style={{
                          background: COLOR_HEX[c],
                          boxShadow:
                            color === c ? `0 0 16px -2px ${COLOR_HEX[c]}` : `0 0 8px -3px ${COLOR_HEX[c]}`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Target */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-mist-500">
                      Times per week
                    </span>
                    <span className="text-sm font-bold text-mist-100 tabular">{target}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-aqua-400 outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-aqua-300 [&::-webkit-slider-thumb]:shadow-[0_0_10px_-1px_var(--color-aqua-400)]"
                  />
                  <div className="flex justify-between text-[0.62rem] font-medium text-mist-500">
                    <span>1× / week</span>
                    <span>7× / week</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-4">
                <button type="button" onClick={onClose} className="btn-ghost">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!name.trim()}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  <Plus size={16} strokeWidth={2.4} />
                  Create habit
                </button>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
