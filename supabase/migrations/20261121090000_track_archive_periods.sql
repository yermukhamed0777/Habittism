alter table public.habits
  add column archive_periods jsonb not null default '[]'::jsonb
  check (jsonb_typeof(archive_periods) = 'array' and not jsonb_path_exists(
    archive_periods,
    '$[*] ? (@.type() != "object" || !exists(@.start) || !exists(@.end)
      || (@.start.type() != "string" && @.start.type() != "null")
      || (@.end.type() != "string" && @.end.type() != "null"))'
  ));

-- A legacy archive without a timestamp has an unknown start date.
update public.habits
set archive_periods = jsonb_build_array(jsonb_build_object(
  'start', (archived_at at time zone 'UTC')::date,
  'end', null
))
where archived;

create or replace function public.merge_guest_journal(payload jsonb)
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
    weekdays, weekly_target, kind, goal, unit, created_on, archived, archive_periods
  )
  select owner_id, h.id, h.name, h.icon, h.color, h.category, h.custom_category, h.schedule_type,
    h.weekdays, h.weekly_target, h.kind, h.goal, h.unit, h.created_on, h.archived,
    coalesce(h.archive_periods, '[]'::jsonb)
  from jsonb_to_recordset(payload->'habits') as h (
    id uuid, name text, icon text, color text, category text, custom_category text, schedule_type text,
    weekdays smallint[], weekly_target smallint, kind text, goal numeric, unit text, created_on date,
    archived boolean, archive_periods jsonb
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
