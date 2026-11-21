import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const alice = '10000000-0000-4000-8000-000000000001'
const bob = '10000000-0000-4000-8000-000000000002'
const guestId = '20000000-0000-4000-8000-000000000001'
const day = '2026-11-20'
const habit = {
  id: guestId, name: 'Drink water', icon: 'target', color: 'mint', category: 'health',
  schedule_type: 'daily', weekdays: [], weekly_target: 7, kind: 'numeric', goal: 2,
  unit: 'liters', created_on: day, archived: false,
}
const guest = {
  habits: [{ ...habit, archive_periods: [{ start: '2026-11-18', end: '2026-11-19' }] }],
  logs: [{ habit_id: guestId, day, value: 1.5, frozen: false, note: 'A little progress', mood: 'steady' }],
  affirmations: [{ day, body: 'Start again' }],
}
const legacy = {
  habits: [{ ...habit, legacy_id: 'old-walk', name: 'Walk outside', kind: 'binary', goal: 1, unit: '' }],
  logs: [{ legacy_id: 'old-walk', day }],
  affirmations: [{ day, body: 'Do not replace an existing affirmation' }],
}

async function login(user) {
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user])
}

const count = async (table) => (await db.query(`select count(*)::int as count from public.${table}`)).rows[0].count
const merge = (data) => db.query('select public.merge_guest_journal($1::jsonb)', [JSON.stringify(data)])
const importModern = (data) => db.query('select public.import_modern_journal($1::jsonb)', [JSON.stringify(data)])
const importLegacy = (data) => db.query('select public.import_legacy_journal($1::jsonb)', [JSON.stringify(data)])

try {
  await db.exec(`
    create schema auth;
    create role anon;
    create role authenticated;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema auth to anon, authenticated;
  `)
  await db.exec(await readFile('supabase/schema.sql', 'utf8'))
  for (const file of (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'))
  }
  await db.query('insert into auth.users values ($1), ($2)', [alice, bob])

  await login(alice)
  await db.query('insert into public.profiles(id) values ($1)', [alice])
  await merge(guest)
  const savedHabit = (await db.query('select id, archive_periods from public.habits where guest_id = $1', [guestId])).rows[0]
  const aliceHabit = savedHabit.id
  assert.deepEqual(savedHabit.archive_periods, guest.habits[0].archive_periods)
  await assert.rejects(db.query("update public.habits set archive_periods='[null]' where id=$1", [aliceHabit]), { code: '23514' })
  const row = (await db.query('select value::float8, note, mood from public.habit_logs')).rows[0]
  assert.deepEqual(row, { value: 1.5, note: 'A little progress', mood: 'steady' })
  await db.query("update public.habit_logs set value=2, note='Cloud update' where habit_id=$1", [aliceHabit])
  await merge(guest)
  assert.equal(await count('habits'), 1)
  assert.equal(await count('habit_logs'), 1)
  assert.equal((await db.query('select note from public.habit_logs')).rows[0].note, 'Cloud update')
  await importLegacy(legacy)
  await importLegacy(legacy)
  assert.equal(await count('habits'), 2)
  assert.equal(await count('habit_logs'), 2)
  assert.equal((await db.query('select body from public.daily_affirmations')).rows[0].body, 'Start again')

  const invalidId = '20000000-0000-4000-8000-000000000099'
  await assert.rejects(merge({
    habits: [{ ...habit, id: invalidId }],
    logs: [{ ...guest.logs[0], habit_id: invalidId, mood: 'invalid' }],
    affirmations: [],
  }), { code: '23514' })
  assert.equal(await count('habits'), 2)

  const original = { ...guest, habits: [{ ...guest.habits[0], id: aliceHabit, name: 'Older name' }],
    logs: [{ ...guest.logs[0], habit_id: aliceHabit }] }
  await importModern(original)
  await importModern(original)
  assert.equal(await count('habits'), 2)
  assert.equal((await db.query('select name from public.habits where id=$1', [aliceHabit])).rows[0].name, 'Drink water')
  assert.equal((await db.query('select note from public.habit_logs where habit_id=$1', [aliceHabit])).rows[0].note, 'Cloud update')

  await login(bob)
  for (const table of ['profiles', 'habits', 'habit_logs', 'daily_affirmations']) assert.equal(await count(table), 0)
  assert.equal((await db.query("update public.habit_logs set note='Wrong owner' where habit_id=$1 returning habit_id", [aliceHabit])).rows.length, 0)
  assert.equal((await db.query("update public.habits set archived=true, archive_periods='[]' where id=$1 returning id", [aliceHabit])).rows.length, 0)
  await assert.rejects(db.query('insert into public.habit_logs(habit_id, day, value) values ($1,$2,1)', [aliceHabit, day]), { code: '23503' })
  await assert.rejects(db.query('insert into public.habit_logs(user_id, habit_id, day, value) values ($1,$2,$3,1)', [alice, aliceHabit, day]), { code: '42501' })
  await importModern(original)
  await importModern(original)
  assert.equal(await count('habits'), 1)
  assert.equal(await count('habit_logs'), 1)
  assert.equal((await db.query('select note from public.habit_logs')).rows[0].note, 'A little progress')
  assert.notEqual((await db.query('select id from public.habits')).rows[0].id, aliceHabit)

  await db.exec('set role anon')
  await assert.rejects(db.query('select note from public.habit_logs'), { code: '42501' })
  await assert.rejects(merge(guest), { code: '42501' })
  await assert.rejects(importLegacy(legacy), { code: '42501' })
  await assert.rejects(importModern(guest), { code: '42501' })
  console.log('PASS PostgreSQL owner isolation, reflections, atomic guest merge, conflict handling, and legacy import')
} finally {
  await db.close()
}
