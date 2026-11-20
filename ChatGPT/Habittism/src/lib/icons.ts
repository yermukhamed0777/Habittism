import {
  BookOpen,
  Dumbbell,
  Languages,
  Moon,
  PenLine,
  Phone,
  Target,
  type LucideIcon,
} from 'lucide-react'

/** Registry of the icons a habit can be assigned. */
export const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  target: Target,
  run: Target,
  dumbbell: Dumbbell,
  book: BookOpen,
  pen: PenLine,
  languages: Languages,
  phone: Phone,
  moon: Moon,
}

export const ICON_CHOICES = Object.keys(HABIT_ICON_MAP)
