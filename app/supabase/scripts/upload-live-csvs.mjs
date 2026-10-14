/**
 * Uploads the regenerated real-NOUN-data CSVs (csv-files/courses.csv,
 * lecturers.csv, lectures-bulk.csv) through the ACTUAL Admin UI upload flow
 * (not a direct DB write) -- this is the real path a human admin would use,
 * and it's the only way lecturer accounts get created (via the create-lecturer
 * edge function, which the lecturer bulk-import modal calls once per row).
 *
 * Order matters: Courses -> Lecturers -> Lectures. Lectures resolves
 * course_code by exact lookup and facilitator_name by substring match against
 * rows already imported from the first two uploads.
 *
 * The lecturer step does ~885 SEQUENTIAL signups (one fetch per row, awaited
 * in a for-loop in the browser) -- expect this step alone to take many
 * minutes. This script polls for completion with a long timeout rather than
 * assuming a fixed duration.
 *
 * Run: node --env-file=.env.local supabase/scripts/upload-live-csvs.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.APP_URL || 'http://localhost:5176'
const ADMIN_EMAIL = 'admin@noun.edu.ng'

const CSV_FILES_DIR = new URL('../../csv-files/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const COURSES_CSV       = `${CSV_FILES_DIR}courses.csv`
const LECTURERS_CSV     = `${CSV_FILES_DIR}lecturers.csv`
const LECTURES_BULK_CSV = `${CSV_FILES_DIR}lectures-bulk.csv`

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Run with --env-file=.env.local and ensure VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_ROLE_KEY are set.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function loginAsAdmin(page) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink', email: ADMIN_EMAIL, options: { redirectTo: APP_URL + '/' },
  })
  if (error) throw new Error(`generateLink failed: ${error.message}`)
  await page.goto(data.properties.action_link, { timeout: 60000 })
  await page.waitForURL(`${APP_URL}/**`, { timeout: 30000 })
  await page.waitForTimeout(3000)
}

async function uploadCourses(page) {
  console.log('\n── Courses ──────────────────────────────')
  await page.goto(`${APP_URL}/admin/courses`)
  await page.waitForSelector('h1:has-text("Courses")', { timeout: 15000 })
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("Import Courses")').click()
  const courseFileInput = page.locator('input[type="file"]')
  await courseFileInput.waitFor({ state: 'attached', timeout: 8000 })
  await courseFileInput.setInputFiles(COURSES_CSV)
  await page.waitForSelector('text=/Preview\\s+\\d+\\s+course/i', { timeout: 15000 })
  const importBtn = page.getByRole('button', { name: /^Import \d+ Courses?$/ })
  await importBtn.click()
  await page.waitForSelector('text=Import complete:', { timeout: 60000 })
  const okCount = await page.locator('.text-green-500').count()
  console.log(`  Courses import finished (${okCount} success row(s) rendered)`)
  await page.locator('button:has-text("Done")').click()
}

async function uploadLecturers(page) {
  console.log('\n── Lecturers (this will take a while — ~885 sequential signups) ──')
  await page.goto(`${APP_URL}/admin/users`)
  await page.waitForSelector('h1:has-text("Users")', { timeout: 15000 })
  await page.waitForTimeout(1500)
  // Tab selector is the app's custom Select.jsx — a button that opens a listbox,
  // not a native <select>. It's the first Select rendered on this page (the
  // status/other filters that follow use the same w-32/shrink-0 wrapper too,
  // so scope strictly to the first one).
  await page.locator('.w-32.shrink-0 button').first().click()
  await page.waitForTimeout(300)
  await page.locator('ul li button:has-text("Lecturers")').first().click()
  await page.waitForTimeout(800)
  await page.locator('button:has-text("Import Lecturers")').click()
  const lecturerFileInput = page.locator('input[type="file"]')
  await lecturerFileInput.waitFor({ state: 'attached', timeout: 8000 })
  await lecturerFileInput.setInputFiles(LECTURERS_CSV)
  await page.waitForSelector('text=/Preview\\s+\\d+\\s+lecturer/i', { timeout: 15000 })
  const importBtn = page.getByRole('button', { name: /^Import \d+ Lecturers?$/ })
  const startedAt = Date.now()
  await importBtn.click()
  // Long poll — the modal stays on "importing" until all sequential fetches resolve.
  await page.waitForSelector('text=Import complete:', { timeout: 45 * 60 * 1000 })
  const mins = ((Date.now() - startedAt) / 60000).toFixed(1)
  console.log(`  Lecturer import finished in ${mins} min`)
  await page.locator('button:has-text("Done")').click()
}

async function uploadLectures(page) {
  console.log('\n── Lectures ─────────────────────────────')
  await page.goto(`${APP_URL}/admin/lectures`)
  await page.waitForSelector('h1:has-text("Lectures")', { timeout: 15000 })
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("Bulk Import")').click()
  const lectureFileInput = page.locator('input[type="file"]')
  await lectureFileInput.waitFor({ state: 'attached', timeout: 8000 })
  await lectureFileInput.setInputFiles(LECTURES_BULK_CSV)
  await page.waitForSelector('text=/row\\(s\\) ready to import/i', { timeout: 15000 })
  // DB is already clean (post reset-demo.mjs) — leave "Replace existing lectures" off, click default "Import All"
  await page.locator('button:has-text("Import All")').click()
  // ~43,672 rows / 500 per batch ≈ 88 batches — generous ceiling given this
  // project's intermittent connect-timeout blips seen throughout this session.
  await page.waitForSelector('button:has-text("Done")', { timeout: 20 * 60 * 1000 })
  const resultLines = await page.locator('.rounded-lg.bg-green-50, .rounded-lg.bg-red-50').allTextContents()
  for (const line of resultLines) console.log(`  ${line.trim()}`)
  await page.locator('button:has-text("Done")').click()
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('console', msg => { if (msg.type() === 'error') console.log(`  [browser console error] ${msg.text()}`) })

  console.log('Logging in as admin…')
  await loginAsAdmin(page)

  await uploadCourses(page)
  await uploadLecturers(page)
  await uploadLectures(page)

  // ── Final counts straight from Supabase ──────────────────────────────────
  const [{ count: courseCount }, { count: lecturerCount }, { count: lectureCount }] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'lecturer'),
    supabase.from('lectures').select('*', { count: 'exact', head: true }),
  ])

  console.log('\n✅  Upload sequence complete!')
  console.log(`   Courses in DB:   ${courseCount}`)
  console.log(`   Lecturers in DB: ${lecturerCount}`)
  console.log(`   Lectures in DB:  ${lectureCount}`)

  await browser.close()
}

main().catch(err => {
  console.error('\n❌  Upload sequence failed:', err.message)
  process.exit(1)
})
