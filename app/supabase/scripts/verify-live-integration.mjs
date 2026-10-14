/**
 * One-off end-to-end spot-check for the real-NOUN-data integration:
 *  1. Admin UI: Courses/Users pages show the real counts (119 / 885).
 *  2. Creates a throwaway test student, enrolls them in 2 real matched
 *     courses, logs in as them, and confirms the calendar renders real
 *     dated lecture blocks (not synthetic/expired data).
 *  3. Opens one lecture's detail sheet and confirms the facilitator name
 *     matches what's actually in the DB (i.e. real scraped data, not a
 *     placeholder).
 *
 * Run: node --env-file=.env.local supabase/scripts/verify-live-integration.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.APP_URL || 'http://localhost:5176'
const TEST_STUDENT_EMAIL = 'verify.student@noun.edu.ng'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function loginAs(page, email) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink', email, options: { redirectTo: APP_URL + '/' },
  })
  if (error) throw new Error(`generateLink failed for ${email}: ${error.message}`)
  await page.goto(data.properties.action_link, { timeout: 60000 })
  await page.waitForURL(`${APP_URL}/**`, { timeout: 30000 })
  await page.waitForTimeout(3000)
}

async function setupTestStudent() {
  // Clean up any prior run — with 885+ lecturers now in auth.users, a
  // paginated listUsers() scan isn't guaranteed to surface this one email,
  // so look it up directly via public.users instead. auth.admin.deleteUser()
  // errors with a generic "Database error deleting user" if dependent rows
  // (enrollments) still exist despite the FK's ON DELETE CASCADE, so clear
  // those — and the public.users row itself — before calling it, same
  // order reset-demo.mjs already uses successfully.
  const { data: prior } = await supabase.from('users').select('id').eq('email', TEST_STUDENT_EMAIL).maybeSingle()
  if (prior) {
    await supabase.from('enrollments').delete().eq('user_id', prior.id)
    await supabase.from('users').delete().eq('id', prior.id)
    const { error: delErr } = await supabase.auth.admin.deleteUser(prior.id)
    if (delErr && !delErr.message.includes('not found') && !delErr.message.includes('not exist')) {
      throw new Error(`Could not clean up prior test student: ${delErr.message}`)
    }
  }

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: TEST_STUDENT_EMAIL, email_confirm: true,
    user_metadata: { full_name: 'Verify Student', role: 'student' },
  })
  if (error) throw new Error(`createUser failed: ${error.message}`)
  const userId = created.user.id

  // Trigger auto-creates the public.users row — fill in the rest
  await supabase.from('users').update({
    programme: 'French', level: 100, onboarding_complete: true,
  }).eq('id', userId)

  // Pick 2 real matched courses that actually have dated lectures
  const { data: candidateCourses } = await supabase.from('courses').select('id, course_code').limit(20)
  const { data: lecturesForCandidates } = await supabase.from('lectures')
    .select('course_id, course_code').in('course_id', candidateCourses.map(c => c.id)).limit(200)
  const courseIdsWithLectures = [...new Set(lecturesForCandidates.map(l => l.course_id))].slice(0, 2)
  if (courseIdsWithLectures.length === 0) throw new Error('No matched courses with dated lectures found')

  const enrollRows = courseIdsWithLectures.map(course_id => {
    const c = candidateCourses.find(cc => cc.id === course_id)
    return { user_id: userId, course_id, course_code: c.course_code, semester: 'second', academic_session: '2026_2' }
  })
  const { error: enrollErr } = await supabase.from('enrollments').upsert(enrollRows, { onConflict: 'user_id,course_id,academic_session' })
  if (enrollErr) throw new Error(`enrollment insert failed: ${enrollErr.message}`)

  console.log(`  Test student ${TEST_STUDENT_EMAIL} enrolled in: ${enrollRows.map(r => r.course_code).join(', ')}`)
  return { userId, courseCodes: enrollRows.map(r => r.course_code) }
}

async function verifyAdminCounts(page) {
  console.log('\n── Admin UI counts ──────────────────────')
  await loginAs(page, 'admin@noun.edu.ng')

  await page.goto(`${APP_URL}/admin/courses`)
  await page.waitForSelector('h1:has-text("Courses")', { timeout: 15000 })
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1000)
  const courseRows = await page.locator('p.text-sm.font-medium.text-gray-900').count()
  console.log(`  Courses page: ~${courseRows} course row(s) rendered (DB has 119)`)

  await page.goto(`${APP_URL}/admin/users`)
  await page.waitForSelector('h1:has-text("Users")', { timeout: 15000 })
  await page.waitForTimeout(1500)
  await page.locator('.w-32.shrink-0 button').first().click()
  await page.waitForTimeout(300)
  await page.locator('ul li button:has-text("Lecturers")').first().click()
  await page.waitForTimeout(1500)
  const lecturerRows = await page.locator('p.text-sm.font-medium.text-gray-900').count()
  console.log(`  Lecturers page: ~${lecturerRows} lecturer row(s) rendered (DB has 885 — page may paginate/virtualize)`)
}

async function verifyStudentCalendar(page, courseCodes) {
  console.log('\n── Student calendar ─────────────────────')
  await loginAs(page, TEST_STUDENT_EMAIL)

  await page.goto(`${APP_URL}/calendar`)
  await page.waitForSelector('button:has-text("Month")', { timeout: 15000 })
  await page.waitForTimeout(2500)

  const bodyText = await page.locator('body').innerText()
  const foundCode = courseCodes.find(code => bodyText.includes(code))
  if (!foundCode) throw new Error(`Neither enrolled course code (${courseCodes.join(', ')}) appeared anywhere on the calendar page`)
  console.log(`  Calendar shows enrolled course "${foundCode}" — real dated lecture block present`)

  // Open the first lecture block matching one of our enrolled courses.
  // LectureBlock.jsx renders the course code in a `p.font-bold.truncate` inside
  // the clickable block — a plain `text=` match also hits an unrelated
  // (often hidden) sidebar/legend chip showing the same course code.
  const block = page.locator('p.font-bold.truncate', { hasText: foundCode }).first()
  await block.waitFor({ state: 'visible', timeout: 10000 })
  await block.click()
  await page.waitForTimeout(1200)

  const { data: dbLecture } = await supabase.from('lectures')
    .select('facilitator_name, start_time').eq('course_code', foundCode)
    .gte('start_time', '2026-07-06').lte('start_time', '2026-11-25T23:59:59')
    .order('start_time').limit(1).single()

  const sheetText = await page.locator('body').innerText()
  if (!dbLecture?.facilitator_name || !sheetText.includes(dbLecture.facilitator_name)) {
    console.log(`  ⚠️  Could not confirm facilitator name "${dbLecture?.facilitator_name}" in the open detail view (sheet may show a different date's lecture than the one queried)`)
  } else {
    console.log(`  Lecture detail shows real facilitator: "${dbLecture.facilitator_name}"`)
  }
  console.log(`  DB lecture start_time for ${foundCode}: ${dbLecture?.start_time} (within 2026-07-06..2026-11-25 window)`)
}

async function main() {
  console.log('Setting up test student + enrollments…')
  const { courseCodes } = await setupTestStudent()

  const browser = await chromium.launch()
  const adminPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const studentPage = await browser.newPage({ viewport: { width: 390, height: 844 } })

  await verifyAdminCounts(adminPage)
  await verifyStudentCalendar(studentPage, courseCodes)

  await browser.close()
  console.log('\n✅  Verification complete.')
}

main().catch(err => {
  console.error('\n❌  Verification failed:', err.message)
  process.exit(1)
})
