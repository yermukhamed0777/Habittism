alter table public.habit_logs
  add column note text check (char_length(btrim(note)) between 1 and 280),
  add column mood text check (mood in ('energized', 'steady', 'low'));

alter table public.habits
  add column guest_id uuid,
  add unique (user_id, guest_id);

create function public.merge_guest_journal(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception 'Sign in before merging a guest journal' using errcode = '42501';
  end if;
  if jsonb_typeof(payload->'habits') is distinct from 'array'
    or jsonb_typeof(payload->'logs') is distinct from 'array'
    or jsonb_typeof(payload->'affirmations') is distinct from 'array' then
    raise exception 'Invalid guest journal' using errcode = '22023';
  end if;

  insert into public.habits (
    user_id, guest_id, name, icon, color, category, custom_category, schedule_type,
    weekdays, weekly_target, kind, goal, unit, created_on, archived
  )
  select owner_id, h.id, h.name, h.icon, h.color, h.category, h.custom_category, h.schedule_type,
    h.weekdays, h.weekly_target, h.kind, h.goal, h.unit, h.created_on, h.archived
  from jsonb_to_recordset(payload->'habits') as h (
    id uuid, name text, icon text, color text, category text, custom_category text, schedule_type text,
    weekdays smallint[], weekly_target smallint, kind text, goal numeric, unit text, created_on date, archived boolean
  )
  on conflict (user_id, guest_id) do nothing;

  insert into public.habit_logs (user_id, habit_id, day, value, frozen, note, mood)
  select owner_id, h.id, l.day, l.value, l.frozen, l.note, l.mood
  from jsonb_to_recordset(payload->'logs') as l (
    habit_id uuid, day date, value numeric, frozen boolean, note text, mood text
  )
  join public.habits as h on h.user_id = owner_id and h.guest_id = l.habit_id
  on conflict (user_id, habit_id, day) do nothing;

  insert into public.daily_affirmations (user_id, day, body)
  select owner_id, a.day, a.body
  from jsonb_to_recordset(payload->'affirmations') as a (day date, body text)
  on conflict (user_id, day) do nothing;
end;
$$;

revoke execute on function public.merge_guest_journal(jsonb) from public, anon, authenticated;
grant execute on function public.merge_guest_journal(jsonb) to authenticated;
