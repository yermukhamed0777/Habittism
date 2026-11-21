-- Migration: 20261122020000_expand_habit_colors.sql
-- Expand habit icon colors from 5 to 18 named accents while maintaining full compatibility

alter table public.habits
  drop constraint if exists habits_color_check;

alter table public.habits
  add constraint habits_color_check
  check (color in (
    'iris', 'aqua', 'mint', 'amber', 'rose',
    'coral', 'peach', 'sand', 'olive', 'emerald',
    'teal', 'sky', 'cobalt', 'indigo', 'violet',
    'plum', 'magenta', 'slate'
  ));
