import { Target } from 'lucide-react'
import { HABIT_ICON_MAP } from '../lib/icons'

export function HabitIcon({
  name,
  size = 16,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const Icon = HABIT_ICON_MAP[name] ?? Target
  return <Icon size={size} strokeWidth={2.1} className={className} />
}
