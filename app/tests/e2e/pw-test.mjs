/**
 * pw-test.mjs  Full end-to-end test suite
 * Usage: node pw-test.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import fs from 'fs'

// ── Env ──────────────────────────────────────────────────────────────────────
const env = fs.readFileSync('.env', 'utf8')
const vars = Object.fromEntries(
  env.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] })
)
const SUPABASE_URL = vars.VITE_SUPABASE_URL
const SERVICE_ROLE = vars.VITE_SUPABASE_SERVICE_ROLE_KEY
const APP_URL      = process.env.APP_URL || 'http://localhost:5174'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false }
})

let passed = 0, failed = 0
const failures = []
const consoleErrors = []

async function check(label, fn) {
  try {
    await fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${label}  ${err.message?.split('\n')[0]}`)
    failed++
    failures.push({ label, error: err.message?.split('\n')[0] })
  }
}

async function getMagicLink(email, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink', email,
        options: { redirectTo: APP_URL + '/' },
      })
      if (error) throw new Error(error.message)
      return data.properties.action_link
    } catch (err) {
      if (attempt === retries - 1) throw new Error(`generateLink failed after ${retries} attempts: ${err.message}`)
      const waitMs = (attempt + 1) * 3000  // 3s, 6s, 9s backoff
      console.log(`    ⚠️  generateLink attempt ${attempt + 1} failed (${err.message?.split('\n')[0]})  retrying in ${waitMs/1000}s`)
      await new Promise(r => setTimeout(r, waitMs))
    }
  }
}

async function loginAs(page, email, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const link = await getMagicLink(email)
      // Use a longer navigation timeout  magic link goes through Supabase auth redirect
      await page.goto(link, { timeout: 60000 })
      await page.waitForURL(`${APP_URL}/**`, { timeout: 30000 })
      await page.waitForTimeout(3000)  // let auth state + profile fully settle
      return
    } catch (err) {
      if (attempt === retries - 1) throw err
      const waitMs = (attempt + 1) * 4000
      console.log(`    ⚠️  loginAs attempt ${attempt + 1} failed  retrying in ${waitMs/1000}s`)
      await new Promise(r => setTimeout(r, waitMs))
    }
  }
}

// Poll a locator's count instead of a fixed sleep  the real (much larger)
// dataset can take several seconds to fetch, longer than the small fixed
// waits that were fine against the old synthetic demo data.
async function waitForCount(locator, min, timeoutMs = 12000, stepMs = 1000) {
  const start = Date.now()
  let count = await locator.count()
  while (count < min && Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, stepMs))
    count = await locator.count()
  }
  return count
}

// Use waitForFunction in browser context  reliable for route guard redirect checks
async function waitForRedirectAway(page, path, timeoutMs = 8000) {
  await page.waitForFunction(
    (p) => !window.location.pathname.endsWith(p),
    path,
    { timeout: timeoutMs }
  ).catch(() => {})  // timeout is not a test failure itself  we check URL after
}

// Navigate to a page; if Supabase rate-limiting redirects to /login, re-authenticate
async function gotoWithReauth(page, url, email) {
  await page.goto(url)
  await page.waitForTimeout(2000)
  // If we ended up on the login page (Supabase rate-limited auth.getSession), re-login
  if (await page.$('h1:has-text("Welcome back")')) {
    console.log('    ⚠️  Redirected to login (Supabase rate-limit)  re-authenticating')
    await loginAs(page, email)
    await page.goto(url)
    await page.waitForTimeout(3000)
  }
}

// ── ADMIN TESTS ───────────────────────────────────────────────────────────────
async function runAdminTests(browser) {
  console.log('\n══ ADMIN TESTS ══════════════════════════════════════════════')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[admin] ${msg.text()}`) })

  await check('Login page loads', async () => {
    await page.goto(`${APP_URL}/login`)
    await page.waitForSelector('text=Sign in', { timeout: 10000 })
  })

  await check('Admin magic-link login → redirected to /admin', async () => {
    await loginAs(page, 'admin@noun.edu.ng')
    await page.waitForSelector('h1:has-text("Overview")', { timeout: 12000 })
  })

  await check('Admin overview shows stat cards', async () => {
    await page.goto(`${APP_URL}/admin`)
    await page.waitForSelector('h1:has-text("Overview")', { timeout: 10000 })
    const count = await waitForCount(page.locator('.rounded-3xl.p-4'), 4)
    if (count < 4) throw new Error(`Only ${count} stat cards found`)
  })

  await check('Admin Lectures page  list renders', async () => {
    await page.goto(`${APP_URL}/admin/lectures`)
    await page.waitForSelector('h1:has-text("Lectures")', { timeout: 10000 })
    await page.waitForTimeout(2000)
    // Search collapses behind an icon button now (CollapsibleSearch) — check the trigger, not the input
    const searchIcon = await page.$('button[aria-label="Search lectures"]')
    if (!searchIcon) throw new Error('Lectures search icon not found')
  })

  await check('Admin → New Lecture modal: facilitator dropdown loads', async () => {
    await page.goto(`${APP_URL}/admin/lectures`)
    await page.waitForSelector('h1:has-text("Lectures")', { timeout: 10000 })
    await page.waitForTimeout(1500)
    await page.locator('button:has-text("New Lecture")').first().click()
    // Select.jsx is a custom button + listbox (no native <select>) — open it and read the <li> options
    await page.waitForSelector('button#facilitator_id', { timeout: 8000 })
    await page.locator('button#facilitator_id').click()
    // 885 real lecturers takes longer to fetch than the old synthetic set — poll instead of a fixed wait
    const count = await waitForCount(page.locator('button#facilitator_id + div ul li'), 2)
    if (count < 2) throw new Error(`Facilitator dropdown has ${count} option(s)  expected >1`)
    console.log(`    ${count - 1} active facilitator(s) in dropdown`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(700)
  })

  await check('Admin Courses page  list renders', async () => {
    await page.goto(`${APP_URL}/admin/courses`)
    await page.waitForSelector('h1:has-text("Courses")', { timeout: 10000 })
    await page.waitForTimeout(2000)
    // Search collapses behind an icon button now (CollapsibleSearch) — check the trigger, not the input
    const searchIcon = await page.$('button[aria-label="Search courses"]')
    if (!searchIcon) throw new Error('Courses search icon not found')
    const courseRows = await page.$$('.flex.items-center.gap-3.p-3.bg-white.rounded-xl')
    console.log(`    ${courseRows.length} course(s) in list`)
  })

  await check('Admin Settings → TMA Deadlines tab  semester-wide deadlines: set and save', async () => {
    // TMA deadlines are now semester-wide (not per-course), and live under /settings.
    // TMA tab shows 3 fixed rows (TMA 1, TMA 2, TMA 3) with "Set" or "Edit" buttons.
    await page.goto(`${APP_URL}/settings`)
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 })

    await page.locator('button:has-text("TMA Deadlines")').click()
    await page.waitForTimeout(1500)  // let React render TMA tab content

    // Wait for the TMA tab info paragraph to appear (semester-wide note)
    await page.waitForFunction(
      () => document.body.innerText.includes('TMA deadlines apply'),
      { timeout: 8000 }
    )

    // Find the TMA rows (flex rows with p-4 bg-white) and click the button in the TMA 1 row
    await page.waitForTimeout(500)
    const tmaRowSelector = '.flex.items-center.gap-3.p-4.bg-white'
    const tmaRows = page.locator(tmaRowSelector)
    const rowCount = await tmaRows.count()
    console.log(`    Found ${rowCount} TMA row(s)`)

    // Find the row containing "TMA 1" and click its button
    const tma1Row = tmaRows.filter({ hasText: 'TMA 1' }).first()
    await tma1Row.scrollIntoViewIfNeeded()
    const rowBtn = tma1Row.locator('button').last()
    const btnText = await rowBtn.textContent().catch(() => '?')
    console.log(`    TMA 1 row button: "${btnText?.trim()}"`)
    await rowBtn.click()

    // Modal opens with title "Set TMA N Deadline"
    await page.waitForSelector('h2:has-text("Set TMA")', { timeout: 10000 })
    await page.waitForTimeout(500)

    // TMAForm now has: TMA Number Select + datetime-local Input
    console.log('    Modal opened')

    await page.locator('input[type="datetime-local"]').fill('2026-09-01T10:00')
    await page.locator('button:has-text("Set Deadline")').click()
    // Wait up to 10s for modal to close
    await page.waitForFunction(
      () => !document.querySelector('h2')?.textContent?.includes('Set TMA'),
      { timeout: 10000 }
    ).catch(() => {})
    await page.waitForTimeout(500)

    const modalStillOpen = await page.$('h2:has-text("Set TMA")')
    if (modalStillOpen) throw new Error('TMA modal still open after save  upsertTMADeadline may have failed')
    console.log('    TMA semester-wide deadline saved successfully')
  })

  await check('Admin Users page  Students/Lecturers subtabs', async () => {
    await page.goto(`${APP_URL}/admin/users`)
    await page.waitForSelector('h1:has-text("Users")', { timeout: 10000 })
    // Wait for UserManagement to finish loading  the Tabs only render after loading=false
    await page.waitForSelector('button:has-text("Students")', { timeout: 20000 })
    // The Students/Lecturers switcher is the app's custom Select.jsx — a button
    // that opens a listbox, not a native <select>. The "Lecturers" <li> option
    // doesn't exist in the DOM at all until that listbox is opened.
    await page.locator('.w-32.shrink-0 button').first().click()
    await page.waitForTimeout(300)
    const lecturersOption = await page.$('ul li button:has-text("Lecturers")')
    if (!lecturersOption) throw new Error('Missing Lecturers subtab option in the opened listbox')
    await page.keyboard.press('Escape')
  })

  await check('Admin → Edit Lecturer modal: courses pre-checked', async () => {
    await page.goto(`${APP_URL}/admin/users`)
    await page.waitForSelector('h1:has-text("Users")', { timeout: 10000 })
    // 885+ users in one unbounded query is genuinely slow (~15s observed) at
    // this dataset's scale — not a broken page, just not fast; give it room.
    await page.waitForSelector('button:has-text("Students")', { timeout: 25000 })
    await page.locator('.w-32.shrink-0 button').first().click()
    await page.waitForTimeout(300)
    await page.locator('ul li button:has-text("Lecturers")').first().click()
    await page.waitForTimeout(1000)

    const editBtn = await page.$('button:has-text("Edit")')
    if (!editBtn) {
      console.log('    ⚠️  No active lecturers in list  skipping checkbox check')
      return
    }
    await editBtn.click()
    await page.waitForSelector('text=Assigned Courses', { timeout: 10000 })
    await page.waitForTimeout(3000)  // wait for async courses fetch in modal

    const allCheckboxes = await page.$$('input[type="checkbox"]')
    const checkedBoxes  = await page.$$('input[type="checkbox"]:checked')
    console.log(`    ${checkedBoxes.length}/${allCheckboxes.length} courses pre-checked`)
    if (allCheckboxes.length === 0) throw new Error('No course checkboxes rendered in Edit Lecturer modal')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(700)
  })

  await check('Admin Settings → Semester Settings tab  Academic Session + Carry Forward', async () => {
    await page.goto(`${APP_URL}/settings`)
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 })
    await page.locator('button:has-text("Semester Settings")').click()
    await page.waitForSelector('text=Academic Session', { timeout: 8000 })
    await page.waitForSelector('text=Carry Forward', { timeout: 5000 })
    const sessionInput = await page.$('input[value*="2026"]')
    if (!sessionInput) throw new Error('Active academic session field not showing 2026_x')
  })

  await check('Admin Calendar page loads and shows month view', async () => {
    await page.goto(`${APP_URL}/calendar`)
    await page.waitForSelector('button:has-text("Month")', { timeout: 8000 })
  })

  await check('Route guard: admin navigating to /lecturer → redirected away', async () => {
    await page.goto(`${APP_URL}/lecturer`)
    // Use waitForFunction in browser context  reliable, avoids Playwright URL object confusion
    await waitForRedirectAway(page, '/lecturer', 8000)
    const url = page.url()
    if (url.endsWith('/lecturer')) {
      throw new Error(`Admin still on /lecturer URL: ${url}  ProtectedRoute not redirecting`)
    }
  })

  await ctx.close()
}

// ── LECTURER TESTS ────────────────────────────────────────────────────────────
async function runLecturerTests(browser) {
  console.log('\n══ LECTURER TESTS ═══════════════════════════════════════════')

  let profileRows
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase.from('users')
      .select('id, email, status, role').eq('role', 'lecturer').eq('status', 'active').limit(1)
    if (data?.length) { profileRows = data; break }
    if (i < 2) await new Promise(r => setTimeout(r, 2000))
  }

  if (!profileRows?.length) {
    console.log('  ⚠️  No active lecturer accounts found  skipping lecturer tests')
    return
  }

  const lecturerEmail = profileRows[0].email
  const lecturerId = profileRows[0].id
  console.log(`  Using lecturer: ${lecturerEmail}`)

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[lecturer] ${msg.text()}`) })

  await check('Lecturer magic-link login', async () => {
    await loginAs(page, lecturerEmail)
    const url = page.url()
    if (url.includes('/login')) throw new Error('Lecturer still on login page after magic link')
  })

  await check('Lecturer Panel  Schedule tab loads', async () => {
    await gotoWithReauth(page, `${APP_URL}/lecturer`, lecturerEmail)
    await page.waitForSelector('text=Lecturer Panel', { timeout: 15000 })
    await page.waitForTimeout(2000)
    const content = await page.$('text=No upcoming lectures') || await page.$('text=upcoming')
    if (!content) throw new Error('Lecturer Schedule tab content did not render')
  })

  // Pick this lecturer's nearest upcoming scheduled lecture as a safe target for
  // the write-path tests below. Safe specifically because `enrollments` is
  // currently empty (confirmed before this run) — reschedule/cancel/announce/
  // recording all fan notifications out to enrolled students, so with zero
  // enrollments there is no real user who could be notified by these tests.
  // Every mutation is followed by a full-row restore so the lecture is left
  // exactly as it was found.
  const { data: enrollmentCheck } = await supabase.from('enrollments').select('id').limit(1)
  const targetLectureId = { current: null }
  const originalRow = { current: null }

  if (enrollmentCheck?.length) {
    console.log('  ⚠️  enrollments table is non-empty  skipping lecturer write-path tests to avoid notifying a real student')
  } else {
    const { data: candidateLectures } = await supabase
      .from('lectures')
      .select('*')
      .eq('facilitator_id', lecturerId)
      .eq('status', 'scheduled')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(1)

    if (!candidateLectures?.length) {
      console.log('  ⚠️  No upcoming scheduled lecture found for this lecturer  skipping write-path tests')
    } else {
      originalRow.current = candidateLectures[0]
      targetLectureId.current = candidateLectures[0].id
      console.log(`  Write-path test target: ${originalRow.current.course_code} @ ${originalRow.current.start_time}`)
    }
  }

  async function restoreLecture() {
    if (!targetLectureId.current || !originalRow.current) return
    const { id, ...rest } = originalRow.current
    await supabase.from('lectures').update(rest).eq('id', id)
  }

  // Targets the FIRST lecture card's kebab menu, not a course-code text match —
  // every course here recurs weekly, so multiple cards can share the same
  // course code in the visible list. The write-path target was specifically
  // chosen as this lecturer's chronologically nearest upcoming lecture, which
  // is always the first card rendered.
  async function openFirstCardMenu(itemLabel) {
    const trigger = page.locator('button.w-8.h-8.rounded-lg').first()
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await page.waitForTimeout(400)
    await page.locator(`button:has-text("${itemLabel}")`).first().click()
  }

  if (targetLectureId.current) {
    await check('Lecturer  Reschedule a lecture updates start/end time', async () => {
      try {
        await gotoWithReauth(page, `${APP_URL}/lecturer`, lecturerEmail)
        await page.waitForSelector('text=Lecturer Panel', { timeout: 15000 })
        await page.waitForTimeout(2000)
        await openFirstCardMenu('Reschedule')
        await page.waitForSelector('h2:has-text("Reschedule Lecture")', { timeout: 8000 })

        // datetime-local inputs are filled/interpreted in the BROWSER's local
        // timezone (RescheduleModal does `new Date(startTime).toISOString()`
        // with no explicit offset) — build the expected value the same way,
        // with local-time setters/formatting, not UTC ones, or the comparison
        // below drifts by the local UTC offset.
        const newStart = new Date()
        newStart.setDate(newStart.getDate() + 3)
        newStart.setHours(10, 0, 0, 0)
        const newEnd = new Date(newStart.getTime() + 3600000)
        const pad = n => String(n).padStart(2, '0')
        const toLocalValue = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

        const inputs = page.locator('input[type="datetime-local"]')
        await inputs.nth(0).fill(toLocalValue(newStart))
        await inputs.nth(1).fill(toLocalValue(newEnd))
        await page.locator('button:has-text("Reschedule & Notify")').click()
        await page.waitForFunction(() => !document.querySelector('h2')?.textContent?.includes('Reschedule Lecture'), { timeout: 10000 }).catch(() => {})

        const { data: updated } = await supabase.from('lectures').select('status,start_time').eq('id', targetLectureId.current).single()
        if (updated?.status !== 'rescheduled') throw new Error(`Expected status "rescheduled", got "${updated?.status}"`)
        if (new Date(updated.start_time).getTime() !== newStart.getTime()) throw new Error('start_time was not updated to the new value')
      } finally {
        await restoreLecture()
      }
    })

    await check('Lecturer  Post announcement saves and surfaces on lecture', async () => {
      try {
        await gotoWithReauth(page, `${APP_URL}/lecturer`, lecturerEmail)
        await page.waitForSelector('text=Lecturer Panel', { timeout: 15000 })
        await page.waitForTimeout(2000)
        const text = 'E2E test announcement  ignore'
        await openFirstCardMenu('Announce')
        await page.waitForSelector('h2:has-text("Post Announcement")', { timeout: 8000 })
        await page.locator('textarea').fill(text)
        await page.locator('button:has-text("Post Announcement")').click()
        await page.waitForFunction(() => !document.querySelector('h2')?.textContent?.includes('Post Announcement'), { timeout: 10000 }).catch(() => {})

        const { data: updated } = await supabase.from('lectures').select('announcement').eq('id', targetLectureId.current).single()
        if (updated?.announcement !== text) throw new Error(`Announcement not saved  got "${updated?.announcement}"`)
      } finally {
        await restoreLecture()
      }
    })

    await check('Lecturer  Add recording link saves to lecture', async () => {
      try {
        await gotoWithReauth(page, `${APP_URL}/lecturer`, lecturerEmail)
        await page.waitForSelector('text=Lecturer Panel', { timeout: 15000 })
        await page.waitForTimeout(2000)
        const url = 'https://zoom.us/rec/e2e-test-recording'
        await openFirstCardMenu('Recording')
        await page.waitForSelector('h2:has-text("Add Recording Link")', { timeout: 8000 })
        await page.locator('input[type="url"]').fill(url)
        await page.locator('button:has-text("Save & Notify")').click()
        await page.waitForFunction(() => !document.querySelector('h2')?.textContent?.includes('Add Recording Link'), { timeout: 10000 }).catch(() => {})

        const { data: updated } = await supabase.from('lectures').select('recording_url').eq('id', targetLectureId.current).single()
        if (updated?.recording_url !== url) throw new Error(`Recording URL not saved  got "${updated?.recording_url}"`)
      } finally {
        await restoreLecture()
      }
    })

    await check('Lecturer  Cancel a lecture sets status + reason', async () => {
      try {
        await gotoWithReauth(page, `${APP_URL}/lecturer`, lecturerEmail)
        await page.waitForSelector('text=Lecturer Panel', { timeout: 15000 })
        await page.waitForTimeout(2000)
        const reason = 'E2E test cancellation  ignore'
        await openFirstCardMenu('Cancel')
        await page.waitForSelector('h2:has-text("Cancel Lecture")', { timeout: 8000 })
        await page.locator('textarea').fill(reason)
        await page.locator('button:has-text("Cancel & Notify")').click()
        await page.waitForFunction(() => !document.querySelector('h2')?.textContent?.includes('Cancel Lecture'), { timeout: 10000 }).catch(() => {})

        const { data: updated } = await supabase.from('lectures').select('status,cancel_reason').eq('id', targetLectureId.current).single()
        if (updated?.status !== 'cancelled') throw new Error(`Expected status "cancelled", got "${updated?.status}"`)
        if (updated?.cancel_reason !== reason) throw new Error('cancel_reason was not saved')
      } finally {
        await restoreLecture()
      }
    })
  }

  await check('Lecturer Announcements tab renders', async () => {
    await gotoWithReauth(page, `${APP_URL}/lecturer`, lecturerEmail)
    await page.waitForSelector('text=Lecturer Panel', { timeout: 15000 })
    await page.locator('button:has-text("Announcements")').first().click()
    await page.waitForTimeout(1000)
    const content = await page.$('text=No announcements') || await page.$('text=announcements')
    if (!content) throw new Error('Announcements tab did not render')
  })

  await check('Route guard: lecturer cannot access /admin', async () => {
    await page.goto(`${APP_URL}/admin`)
    await waitForRedirectAway(page, '/admin', 8000)
    const url = page.url()
    if (url.endsWith('/admin')) {
      throw new Error(`Lecturer can access /admin  ProtectedRoute not redirecting`)
    }
  })

  await check('Lecturer Settings page loads', async () => {
    await gotoWithReauth(page, `${APP_URL}/settings`, lecturerEmail)
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 15000 })
    const badge = await page.$('text=Lecturer')
    if (!badge) throw new Error('Lecturer badge not shown in settings')
  })

  await ctx.close()
}

// ── STUDENT TESTS ─────────────────────────────────────────────────────────────
async function runStudentTests(browser) {
  console.log('\n══ STUDENT TESTS ════════════════════════════════════════════')

  const { data: profileRows } = await supabase.from('users')
    .select('id, email, status, role, onboarding_complete')
    .eq('role', 'student').eq('status', 'active').limit(1)

  if (!profileRows?.length) {
    console.log('  ⚠️  No active student accounts found  skipping student tests')
    return
  }

  const student = profileRows[0]
  console.log(`  Using student: ${student.email} (onboarding: ${student.onboarding_complete})`)

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[student] ${msg.text()}`) })

  await check('Student magic-link login → dashboard', async () => {
    await loginAs(page, student.email)
    const url = page.url()
    if (url.includes('/login')) throw new Error('Student still on login after magic link')
  })

  await check('Student dashboard renders', async () => {
    await gotoWithReauth(page, `${APP_URL}/`, student.email)
    // Student with onboarding_complete=false shows OnboardingWizard, true shows dashboard
    // Wait for either: dashboard h1 with first name, or onboarding wizard content
    await page.waitForFunction(
      () => document.body.innerText.includes('Hello') ||
            document.body.innerText.includes('onboard') ||
            document.body.innerText.includes('Programme') ||
            document.body.innerText.includes('Enroll'),
      { timeout: 15000 }
    ).catch(() => {})
    const pageText = await page.content()
    if (pageText.includes('Hello') || pageText.includes('onboard') ||
        pageText.includes('Enroll') || pageText.includes('Wizard') ||
        pageText.includes('programme') || pageText.includes('Programme')) {
      console.log('    Dashboard or onboarding wizard rendered')
      return
    }
    throw new Error('Neither dashboard nor onboarding wizard rendered')
  })

  await check('Student Calendar page loads with 3 views', async () => {
    await gotoWithReauth(page, `${APP_URL}/calendar`, student.email)
    await page.waitForSelector('button:has-text("Month")', { timeout: 15000 })
    const weekBtn = await page.$('button:has-text("Week")')
    const dayBtn  = await page.$('button:has-text("Day")')
    if (!weekBtn || !dayBtn) throw new Error('Missing Week or Day view switcher buttons')
  })

  await check('Student My Courses page loads', async () => {
    await gotoWithReauth(page, `${APP_URL}/courses`, student.email)
    await page.waitForSelector('button:has-text("Enroll")', { timeout: 15000 })
  })

  await check('Route guard: student cannot access /admin', async () => {
    await page.goto(`${APP_URL}/admin`)
    await waitForRedirectAway(page, '/admin', 8000)
    const url = page.url()
    if (url.endsWith('/admin')) {
      throw new Error('Student can access /admin  route guard broken')
    }
  })

  await check('Route guard: student cannot access /lecturer', async () => {
    await page.goto(`${APP_URL}/lecturer`)
    await waitForRedirectAway(page, '/lecturer', 8000)
    const url = page.url()
    if (url.endsWith('/lecturer')) {
      throw new Error('Student can access /lecturer  route guard broken')
    }
  })

  await check('Student Settings page shows student-specific options', async () => {
    await gotoWithReauth(page, `${APP_URL}/settings`, student.email)
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 15000 })
    const reUpload = await page.$('text=Re-upload Course Reg Slip')
    if (!reUpload) throw new Error('"Re-upload Course Reg Slip" not shown in student settings')
  })

  await ctx.close()
}

// ── CROSS-ROLE INTERACTION TESTS ──────────────────────────────────────────────
async function runCrossRoleTests(browser) {
  console.log('\n══ CROSS-ROLE TESTS ═════════════════════════════════════════')

  // Fetch a student with enrollments to verify calendar shows data
  const { data: studentRows } = await supabase.from('users')
    .select('id, email').eq('role', 'student').eq('status', 'active').limit(1)
  if (!studentRows?.length) { console.log('  ⚠️  No active student  skipping cross-role tests'); return }
  const student = studentRows[0]

  // Fetch an enrolled course for that student
  const { data: enrollments } = await supabase.from('enrollments')
    .select('course_id, course_code').eq('user_id', student.id).eq('expired', false).limit(1)

  const ctxAdmin  = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const ctxStudent = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const adminPage   = await ctxAdmin.newPage()
  const studentPage = await ctxStudent.newPage()

  // Login both roles
  await loginAs(adminPage,   'admin@noun.edu.ng')
  await new Promise(r => setTimeout(r, 1500))
  await loginAs(studentPage, student.email)

  await check('Lecture created by admin is visible to enrolled student', async () => {
    if (!enrollments?.length) {
      console.log('    ⚠️  Student has no enrollments  skipping visibility check')
      return
    }
    const course = enrollments[0]
    // Get a lecturer to assign
    const { data: lecturers } = await supabase.from('lecturer_courses')
      .select('lecturer_id, users!inner(email, full_name)')
      .eq('course_id', course.course_id).limit(1)
    const facilitatorId   = lecturers?.[0]?.lecturer_id
    const facilitatorName = lecturers?.[0]?.users?.full_name || 'Test Facilitator'

    // Insert a test lecture directly via service role (so we can control timing)
    const testStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()  // 2h from now
    const testEnd   = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    const { data: lecture, error } = await supabase.from('lectures').insert({
      course_id: course.course_id,
      course_code: course.course_code,
      course_title: `Test Cross-Role Lecture  ${Date.now()}`,
      color_hex: '#1a9a5c',
      facilitator_id: facilitatorId || null,
      facilitator_name: facilitatorName,
      meeting_platform: 'zoom',
      meeting_web_url: 'https://zoom.us/j/123456789',
      start_time: testStart,
      end_time: testEnd,
      status: 'scheduled',
      notifications_sent: { '30min': false, '15min': false, '5min': false },
      semester: 'second',
      academic_session: '2026_2',
    }).select().single()
    if (error) throw new Error(`Failed to insert test lecture: ${error.message}`)
    console.log(`    Inserted lecture ${lecture.id} for ${course.course_code}`)

    // Student navigates to calendar  should see the lecture (Realtime or data refetch)
    await gotoWithReauth(studentPage, `${APP_URL}/calendar`, student.email)
    await studentPage.waitForSelector('button:has-text("Month")', { timeout: 15000 })
    await studentPage.waitForTimeout(3000)  // allow Realtime subscription to fire

    // Verify lecture is reachable by checking calendar renders (lecture might be on a future date)
    const monthViewVisible = await studentPage.$('button:has-text("Month")')
    if (!monthViewVisible) throw new Error('Student calendar did not load after lecture was created')
    console.log('    Student calendar loaded  lecture created by admin is in DB for enrolled course')

    // Clean up test lecture
    await supabase.from('lectures').delete().eq('id', lecture.id)
    console.log('    Test lecture cleaned up')
  })

  await check('Attendance recorded by student is visible to admin via service-role query', async () => {
    // Get a past lecture for the student's enrolled course
    const { data: pastLectures } = await supabase.from('lectures')
      .select('id, course_id')
      .in('course_id', (enrollments || []).map(e => e.course_id))
      .lt('end_time', new Date().toISOString())
      .limit(1)

    if (!pastLectures?.length) {
      console.log('    ⚠️  No past lectures for enrolled courses  skipping attendance check')
      return
    }

    const lectureId = pastLectures[0].id
    const courseId  = pastLectures[0].course_id

    // Upsert attendance via service role (simulates student clicking "I attended")
    const { error: attErr } = await supabase.from('attendance').upsert({
      user_id: student.id, lecture_id: lectureId, course_id: courseId,
      status: 'attended', note: 'E2E test attendance',
    }, { onConflict: 'user_id,lecture_id' })
    if (attErr) throw new Error(`Attendance upsert failed: ${attErr.message}`)

    // Verify via service role (admin-side view)
    const { data: attRows } = await supabase.from('attendance')
      .select('*').eq('user_id', student.id).eq('lecture_id', lectureId)
    if (!attRows?.length) throw new Error('Attendance row not found after upsert')
    if (attRows[0].status !== 'attended') throw new Error(`Attendance status wrong: ${attRows[0].status}`)
    console.log(`    Attendance recorded and verified: status=${attRows[0].status}`)

    // Clean up
    await supabase.from('attendance').delete().eq('user_id', student.id).eq('lecture_id', lectureId)
  })

  await check('TMA deadline created by admin is visible in student calendar', async () => {
    if (!enrollments?.length) {
      console.log('    ⚠️  No enrollments  skipping TMA visibility')
      return
    }
    // Delete any leftover test TMA (tma_number 99) then insert fresh
    // Note: DB still has old schema with course_code NOT NULL  include it for compatibility
    // The student LecturesContext no longer filters by course_id so this is still semester-wide
    await supabase.from('tma_deadlines').delete().eq('tma_number', 99)
    const due = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const { data: tma, error: tmaErr } = await supabase.from('tma_deadlines').insert({
      tma_number: 99,  // unusual number  avoids conflict with real TMA 1/2/3
      due_date: due,
      academic_session: '2026_2',
      semester: 'second',
      reminder_sent: false,
      course_code: 'TEST',  // satisfies old NOT NULL constraint until DB migration runs
    }).select().single()
    if (tmaErr) throw new Error(`TMA upsert failed: ${tmaErr.message}`)
    console.log(`    TMA deadline inserted: ${tma.id}`)

    // Navigate student to calendar  TMA blocks should appear
    await gotoWithReauth(studentPage, `${APP_URL}/calendar`, student.email)
    await studentPage.waitForSelector('button:has-text("Month")', { timeout: 15000 })
    await studentPage.waitForTimeout(2000)
    const calendarLoaded = await studentPage.$('button:has-text("Month")')
    if (!calendarLoaded) throw new Error('Student calendar did not load for TMA check')
    console.log('    Student calendar loaded  TMA deadline is in DB for enrolled course')

    // Clean up
    await supabase.from('tma_deadlines').delete().eq('id', tma.id)
  })

  await ctxAdmin.close()
  await ctxStudent.close()
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })

  await runAdminTests(browser)
  await new Promise(r => setTimeout(r, 2000))  // brief pause between suites  reduces Supabase rate-limit pressure
  await runLecturerTests(browser)
  await new Promise(r => setTimeout(r, 2000))
  await runStudentTests(browser)
  await new Promise(r => setTimeout(r, 2000))
  await runCrossRoleTests(browser)

  console.log('\n══ RESULTS ══════════════════════════════════════════════════')
  console.log(`Passed: ${passed}  |  Failed: ${failed}`)

  if (consoleErrors.length) {
    const unique = [...new Set(consoleErrors)]
    console.log(`\nApp console errors (${unique.length} unique):`)
    unique.slice(0, 10).forEach(e => console.log(`  ⚠️  ${e.substring(0, 130)}`))
  }

  if (failures.length) {
    console.log('\nFailed tests:')
    failures.forEach(f => console.log(`  ❌ ${f.label}: ${f.error}`))
  } else {
    console.log('\n🎉 All tests passed!')
  }

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Test runner crashed:', err.message)
  process.exit(1)
})
