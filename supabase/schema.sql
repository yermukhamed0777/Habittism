begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  legacy_id text check (char_length(legacy_id) between 1 and 200),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  icon text not null check (char_length(icon) between 1 and 32),
  color text not null check (color in ('iris', 'aqua', 'mint', 'amber', 'rose')),
  category text not null check (category in ('health', 'focus', 'mindset', 'fitness', 'custom')),
  custom_category text check (char_length(btrim(custom_category)) between 1 and 40),
  schedule_type text not null check (schedule_type in ('daily', 'weekdays', 'weekly')),
  weekdays smallint[] not null default '{}',
  weekly_target smallint not null default 7 check (weekly_target between 1 and 7),
  kind text not null default 'binary' check (kind in ('binary', 'numeric')),
  goal numeric not null default 1 check (goal > 0 and goal <= 1000000000),
  unit text not null default '' check (char_length(unit) <= 24),
  created_on date not null,
  created_at timestamptz not null default now(),
  archived boolean not null default false,
  unique (user_id, id),
  unique (user_id, legacy_id),
  check (array_position(weekdays, null) is null and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  check ((schedule_type = 'weekdays' and cardinality(weekdays) between 1 and 7)
    or (schedule_type <> 'weekdays' and cardinality(weekdays) = 0)),
  check (kind <> 'binary' or (goal = 1 and unit = '')),
  check (category = 'custom' or custom_category is null)
);

create index habits_owner_created_idx on public.habits (user_id, created_at, id);

create table public.habit_logs (
  user_id uuid not null default auth.uid(),
  habit_id uuid not null,
  day date not null,
  value numeric not null default 0 check (value >= 0 and value <= 1000000000),
  frozen boolean not null default false,
  primary key (user_id, habit_id, day),
  foreign key (user_id, habit_id) references public.habits (user_id, id) on delete cascade,
  check (not frozen or value = 0)
);

create index habit_logs_owner_day_idx on public.habit_logs (user_id, day);

create table public.daily_affirmations (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  primary key (user_id, day)
);

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.daily_affirmations enable row level security;

revoke all on public.profiles, public.habits, public.habit_logs, public.daily_affirmations
  from public, anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.habits, public.habit_logs, public.daily_affirmations
  to authenticated;

create policy profile_owner on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy habit_owner on public.habits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy log_owner on public.habit_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy affirmation_owner on public.daily_affirmations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Import one browser backup atomically. Retries retain any existing cloud data.
create function public.import_legacy_journal(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception 'Sign in before importing a journal' using errcode = '42501';
  end if;
  if jsonb_typeof(payload->'habits') is distinct from 'array'
    or jsonb_typeof(payload->'logs') is distinct from 'array'
    or jsonb_typeof(payload->'affirmations') is distinct from 'array' then
    raise exception 'Invalid journal backup' using errcode = '22023';
  end if;

  insert into public.habits (
    user_id, legacy_id, name, icon, color, category, custom_category, schedule_type,
    weekdays, weekly_target, kind, goal, unit, created_on, archived
  )
  select owner_id, h.legacy_id, h.name, h.icon, h.color, h.category, h.custom_category, h.schedule_type,
    h.weekdays, h.weekly_target, h.kind, h.goal, h.unit, h.created_on, h.archived
  from jsonb_to_recordset(payload->'habits') as h (
    legacy_id text, name text, icon text, color text, category text, custom_category text, schedule_type text,
    weekdays smallint[], weekly_target smallint, kind text, goal numeric, unit text, created_on date, archived boolean
  )
  where h.legacy_id is not null
  on conflict (user_id, legacy_id) do nothing;

  insert into public.habit_logs (user_id, habit_id, day, value)
  select owner_id, h.id, l.day, 1
  from jsonb_to_recordset(payload->'logs') as l (legacy_id text, day date)
  join public.habits as h on h.user_id = owner_id and h.legacy_id = l.legacy_id
  on conflict (user_id, habit_id, day) do nothing;

  insert into public.daily_affirmations (user_id, day, body)
  select owner_id, a.day, a.body
  from jsonb_to_recordset(payload->'affirmations') as a (day date, body text)
  on conflict (user_id, day) do nothing;
end;
$$;

revoke execute on function public.import_legacy_journal(jsonb) from public, anon, authenticated;
grant execute on function public.import_legacy_journal(jsonb) to authenticated;

commit;
