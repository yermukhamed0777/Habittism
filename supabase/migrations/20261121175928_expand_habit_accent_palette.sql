alter table public.habits
  drop constraint habits_color_check,
  add constraint habits_color_check check (color in (
    'iris', 'aqua', 'mint', 'amber', 'rose', 'violet', 'indigo', 'cobalt',
    'sky', 'cyan', 'emerald', 'lime', 'gold', 'tangerine', 'coral', 'magenta'
  ));
