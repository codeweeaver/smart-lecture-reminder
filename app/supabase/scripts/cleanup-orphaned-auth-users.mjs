/**
 * One-off cleanup: deletes every auth.users row except the admin, regardless
 * of whether a matching public.users row still exists. Needed specifically
 * after an interrupted reset-demo.mjs run where public.users was already
 * cleared but the auth.users deletion loop didn't finish — reset-demo.mjs
 * discovers "non-admins to delete" via public.users, so it can no longer see
 * these orphaned auth-only accounts on a re-run.
 *
 * Run: node --env-file=.env.local supabase/scripts/cleanup-orphaned-auth-users.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = 'admin@noun.edu.ng'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms) })
  try { return await Promise.race([promise, timeout]) }
  finally { clearTimeout(timer) }
}

async function deleteAuthUser(id, retries = 2) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { error } = await withTimeout(supabase.auth.admin.deleteUser(id), 15000)
      if (!error || error.message.includes('not found') || error.message.includes('not exist')) return { ok: true }
      if (attempt === retries - 1) return { ok: false, message: error.message }
    } catch (err) {
      if (attempt === retries - 1) return { ok: false, message: err.message }
    }
    await new Promise(r => setTimeout(r, 1500))
  }
}

async function main() {
  console.log('Listing all auth users...')
  let allUsers = []
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    allUsers.push(...data.users)
    if (data.users.length < 200) break
    page++
  }
  const targets = allUsers.filter(u => u.email !== ADMIN_EMAIL)
  console.log(`Found ${allUsers.length} total auth user(s), ${targets.length} to delete (all except ${ADMIN_EMAIL})`)

  let deleted = 0, failed = []
  for (const u of targets) {
    const result = await deleteAuthUser(u.id)
    if (result.ok) { deleted++; if (deleted % 100 === 0) console.log(`  ...${deleted}/${targets.length} deleted`) }
    else { failed.push(u.email); console.error(`  ❌  ${u.email}: ${result.message}`) }
  }
  console.log(`\n✅  Done. ${deleted} deleted, ${failed.length} failed.`)
  if (failed.length) console.log('Failed:', failed.join(', '))
}

main().catch(err => { console.error('Unexpected error:', err.message); process.exit(1) })
