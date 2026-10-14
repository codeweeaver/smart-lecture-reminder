/**
 * Uploads just csv-files/lectures-bulk.csv through the real Admin UI —
 * courses and lecturers are already correctly populated, this re-does only
 * the lectures step after clearing the table (needed once BulkImportModal's
 * course-prefetch pagination bug was fixed; the first upload attempt had
 * ~23,000 rows silently fail with "Course not found" because that query
 * capped at Supabase's default 1000-row response limit against 2,095 courses).
 *
 * Run: node --env-file=.env.local supabase/scripts/upload-lectures-only.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.APP_URL || 'http://localhost:5174'
const ADMIN_EMAIL = 'admin@noun.edu.ng'
const LECTURES_BULK_CSV = new URL('../../csv-files/lectures-bulk.csv', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink', email: ADMIN_EMAIL, options: { redirectTo: APP_URL + '/' },
  })
  if (error) throw new Error(`generateLink failed: ${error.message}`)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('console', msg => { if (msg.type() === 'error') console.log(`  [browser console error] ${msg.text()}`) })

  console.log('Logging in as admin…')
  await page.goto(data.properties.action_link, { timeout: 60000 })
  await page.waitForURL(`${APP_URL}/**`, { timeout: 30000 })
  await page.waitForTimeout(3000)

  console.log('\n── Lectures ─────────────────────────────')
  await page.goto(`${APP_URL}/admin/lectures`)
  await page.waitForSelector('h1:has-text("Lectures")', { timeout: 15000 })
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("Bulk Import")').click()
  const lectureFileInput = page.locator('input[type="file"]')
  await lectureFileInput.waitFor({ state: 'attached', timeout: 8000 })
  await lectureFileInput.setInputFiles(LECTURES_BULK_CSV)
  await page.waitForSelector('text=/row\\(s\\) ready to import/i', { timeout: 15000 })
  // Table is already empty (cleared beforehand) — default "Import All" is fine
  await page.locator('button:has-text("Import All")').click()
  await page.waitForSelector('button:has-text("Done")', { timeout: 20 * 60 * 1000 })
  const resultLines = await page.locator('.rounded-lg.bg-green-50, .rounded-lg.bg-red-50').allTextContents()
  for (const line of resultLines.slice(0, 20)) console.log(`  ${line.trim()}`)
  if (resultLines.length > 20) console.log(`  ...and ${resultLines.length - 20} more result line(s)`)
  await page.locator('button:has-text("Done")').click()

  const { count: lectureCount } = await supabase.from('lectures').select('*', { count: 'exact', head: true })
  console.log(`\n✅  Done. Lectures in DB: ${lectureCount}`)

  await browser.close()
}

main().catch(err => {
  console.error('\n❌  Failed:', err.message)
  process.exit(1)
})
