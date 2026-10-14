/**
 * reset-demo.mjs  wipes all transient data for a clean supervisor demo.
 *
 * Keeps: admin account only.
 * Deletes: courses, lectures, enrollments, attendance, notifications,
 *          tma_deadlines, lecturer_courses, and all non-admin auth users.
 * Updates: app_settings → 2026_2 / second semester / Jul 6 – Nov 25, 2026.
 *
 * Run: node --env-file=.env.local reset-demo.mjs
 *
 * Required in .env.local:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing env vars. Ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Retries on failure — intermittent "TypeError: fetch failed" / connect-timeout
// blips have shown up repeatedly against this Supabase project (unrelated to
// any particular table), and a single transient blip shouldn't abort the
// whole reset when a short retry would just work.
async function clearTable(name, label, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const { error, count } = await supabase.from(name).delete({ count: 'exact' }).not('id', 'is', null)
    if (!error) {
      console.log(`  ✓  ${label} cleared (${count ?? '?'} rows)`)
      return
    }
    if (attempt === retries - 1) {
      console.error(`  ❌  ${label}: ${error.message}`)
      return
    }
    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
  }
}

async function main() {
  console.log('\n🔄  Smart Lecture Reminder  Demo Reset\n')

  // ── 1. Clear transient tables (FK-safe order) ──────────────────────────────
  console.log('Clearing transient data…')
  await clearTable('attendance',       'attendance')
  await clearTable('notifications',    'notifications')
  await clearTable('enrollments',      'enrollments')
  await clearTable('tma_deadlines',    'tma_deadlines')
  await clearTable('lecturer_courses', 'lecturer_courses')
  await clearTable('lectures',         'lectures')
  await clearTable('courses', 'courses')

  // ── 2. Delete all non-admin users (students AND lecturers) ────────────────
  // Must delete from public.users first (FK blocks auth.admin.deleteUser otherwise)
  console.log('\nRemoving non-admin users…')
  const { data: nonAdmins, error: listErr } = await supabase
    .from('users')
    .select('id, email, role')
    .neq('role', 'admin')

  if (listErr) {
    console.error(`  ❌  Could not list non-admin users: ${listErr.message}`)
  } else if (!nonAdmins || nonAdmins.length === 0) {
    console.log('  ✓  No non-admin users to remove')
  } else {
    const studentCount  = nonAdmins.filter(u => u.role === 'student').length
    const lecturerCount = nonAdmins.filter(u => u.role === 'lecturer').length
    console.log(`  Found ${nonAdmins.length} non-admin user(s): ${studentCount} student(s), ${lecturerCount} lecturer(s)`)

    const ids = nonAdmins.map(u => u.id)

    // Step 1: remove from public.users to release the FK constraint. Batched —
    // a single .in('id', ids) with 885+ UUIDs produced a 400 Bad Request
    // (request/URL size limit), which left every one of those public.users
    // rows in place and made every subsequent auth.admin.deleteUser() call
    // below fail with "Database error deleting user".
    const PUB_DELETE_BATCH = 200
    let pubRemoved = 0
    for (let i = 0; i < ids.length; i += PUB_DELETE_BATCH) {
      const batch = ids.slice(i, i + PUB_DELETE_BATCH)
      const { error: pubErr } = await supabase.from('users').delete().in('id', batch)
      if (pubErr) {
        console.error(`  ❌  Could not delete public.users batch ${i / PUB_DELETE_BATCH + 1}: ${pubErr.message}`)
      } else {
        pubRemoved += batch.length
      }
    }
    console.log(`  ✓  ${pubRemoved}/${ids.length} row(s) removed from public.users`)

    // Step 2: delete from auth.users. Two distinct failure modes seen against
    // this project: (a) a genuine "Database error deleting user" when some
    // FK-referencing row for this specific user slipped past the bulk clears
    // above — cleared with a targeted retry; (b) a raw connect-timeout
    // against Supabase's servers that can hang the underlying fetch
    // indefinitely rather than rejecting — wrapped with a hard timeout so
    // one bad connection can't stall all 885+ remaining users.
    async function withTimeout(promise, ms) {
      let timer
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms) })
      try { return await Promise.race([promise, timeout]) }
      finally { clearTimeout(timer) }
    }

    async function deleteAuthUser(id) {
      try {
        return await withTimeout(supabase.auth.admin.deleteUser(id), 15000)
      } catch (err) {
        return { error: err }
      }
    }

    let deleted = 0, failed = []
    for (const user of nonAdmins) {
      let { error } = await deleteAuthUser(user.id)
      if (error && !error.message.includes('not found') && !error.message.includes('not exist')) {
        await supabase.from('users').delete().eq('id', user.id)
        await supabase.from('enrollments').delete().eq('user_id', user.id)
        await supabase.from('attendance').delete().eq('user_id', user.id)
        await supabase.from('notifications').delete().eq('user_id', user.id)
        await supabase.from('lecturer_courses').delete().eq('lecturer_id', user.id)
        ;({ error } = await deleteAuthUser(user.id))
      }
      if (error && !error.message.includes('not found') && !error.message.includes('not exist')) {
        console.error(`  ❌  ${user.email} (${user.role}): ${error.message}`)
        failed.push(user.email)
      } else {
        deleted++
      }
    }
    console.log(`  ✓  ${deleted} auth user(s) deleted${failed.length ? `, ${failed.length} failed: ${failed.join(', ')}` : ''}`)
  }

  // ── 3. Update app_settings to 2026_2 second semester ──────────────────────
  console.log('\nUpdating app_settings…')
  const settings = [
    { key: 'active_academic_session', value: '2026_2' },
    { key: 'active_semester',         value: 'second' },
    { key: 'facilitation_start',      value: '2026-07-06' },
    { key: 'facilitation_end',        value: '2026-11-25' },
  ]
  for (const s of settings) {
    let error
    for (let attempt = 0; attempt < 3; attempt++) {
      ;({ error } = await supabase.from('app_settings').upsert(s, { onConflict: 'key' }))
      if (!error) break
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
    if (error) {
      console.error(`  ❌  ${s.key}: ${error.message}`)
    } else {
      console.log(`  ✓  ${s.key} = ${s.value}`)
    }
  }

  // ── 4. Summary ─────────────────────────────────────────────────────────────
  const { data: adminUsers } = await supabase
    .from('users')
    .select('email')
    .eq('role', 'admin')

  console.log('\n✅  Demo reset complete!')
  console.log(`   Admin account(s):   ${adminUsers?.map(u => u.email).join(', ') || 'none found'}`)
  console.log('\nDemo sequence:')
  console.log('  1. Log in as admin → https://smart-lecture-reminder-noun.netlify.app')
  console.log('  2. Courses tab  → Import Courses  → upload csv-files/courses.csv')
  console.log('  3. Users tab    → Import Lecturers → upload csv-files/lecturers.csv (password: 12345)')
  console.log('  4. Lectures tab → Bulk Import      → upload csv-files/lectures-bulk.csv')
  console.log('  5. Register a student live → upload PDF slip → show personalized calendar\n')
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message)
  process.exit(1)
})
