/**
 * Scrapes NOUN's public facilitation-timetable site (no login required) and
 * writes 3 CSVs matching the exact columns the app's Admin -> Bulk Import UI
 * already expects: courses.csv, lecturers.csv, lectures.csv. Course
 * title/credits/programme/level are cross-referenced from the existing
 * nounCourses.data.mjs catalogue -- never guessed from the scraped page,
 * since the scraped "Level" field is a NOUN timetable-internal tier code,
 * not the app's 100-400 undergrad scale.
 *
 * Also writes a full raw snapshot (csv-files/noun_facilitation_schedule_<semester>.csv)
 * of every deduplicated scraped row -- this is the archival source used by
 * remap-schedule-semester.mjs / build-live-csvs.mjs to re-date the same real
 * schedule pattern onto a different (currently active) semester window.
 *
 * Run: node supabase/scripts/scrape-facilitation-timetable.mjs
 *
 * Upload order in the Admin UI matters: courses.csv -> lecturers.csv -> lectures.csv.
 * lectures.csv resolves course_code by exact lookup and facilitator_name by
 * substring match against rows already imported from the first two files.
 */

import { chromium } from 'playwright'
import { COURSES } from './nounCourses.data.mjs'
import {
  normalizeCourseCode, sanitizeField,
  buildCourseIndex, crossReferenceCourse,
  aggregateLecturers, dedupeScheduleSlots, expandToWeeklyLectures,
  writeCsv, writeUnmatchedReport,
} from './scheduleTransform.mjs'

// ── Config ───────────────────────────────────────────────────────────────
const BASE_URL = 'https://mylearningspace.nou.edu.ng/info/facilitation-timetable'
const TARGET_SEMESTERS = ['2026_1']
const FACILITATION_START = '2026-07-06'
const FACILITATION_END   = '2026-10-31'
const NAV_DELAY_MS = 800
const PAGE_SAFETY_CEILING = 500

const OUTPUT_DIR = new URL('./output/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const COURSES_CSV   = OUTPUT_DIR + 'courses.csv'
const LECTURERS_CSV = OUTPUT_DIR + 'lecturers.csv'
const LECTURES_CSV  = OUTPUT_DIR + 'lectures.csv'
const UNMATCHED_TXT = OUTPUT_DIR + 'unmatched-courses.txt'

const CSV_FILES_DIR = new URL('../../csv-files/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

// ── URL building ─────────────────────────────────────────────────────────
function buildUrl(semester, pageNum) {
  const params = new URLSearchParams({
    field_facilitator_faculty_target_id_1: 'All',
    field_courses4_fac_course_code_value: '',
    field_day_for_facilitation_value: 'All',
    field_semester_value: semester,
    field_host_department2_value: 'All',
    field_crs4fac_level_value: 'All',
    page: String(pageNum),
  })
  return `${BASE_URL}?${params.toString()}`
}

// ── Scraping ─────────────────────────────────────────────────────────────
async function scrapeOnePage(page, semester, pageNum) {
  const url = buildUrl(semester, pageNum)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {})

  const rawRows = await page.$$eval('table tbody tr', trs =>
    trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()))
  )

  const bodyText = await page.locator('body').innerText()
  const m = bodyText.match(/Displaying\s+([\d,]+)\s*-\s*([\d,]+)\s+of\s+([\d,]+)/i)
  const totalCount = m ? parseInt(m[3].replace(/,/g, ''), 10) : null

  const parsed = []
  for (const [i, cells] of rawRows.entries()) {
    if (cells.length !== 9) {
      console.warn(`[skip] page ${pageNum} row ${i}: expected 9 cells, got ${cells.length} — ${JSON.stringify(cells)}`)
      continue
    }
    const [sem, code, name, email, faculty, dept, level, day, time] = cells
    parsed.push({ semester: sem, course_code: code, facilitator_name: name, email, faculty, department: dept, level, day, time })
  }
  return { rows: parsed, totalCount }
}

async function fetchAllRows(page, semester) {
  const { rows: firstPageRows, totalCount: firstTotal } = await scrapeOnePage(page, semester, 0)
  let totalCount = firstTotal
  if (totalCount === null) {
    console.warn(`Could not parse total count on page 0 for ${semester}; falling back to stop-on-empty-page loop.`)
  }

  const all = [...firstPageRows]
  let pageNum = 1
  while (true) {
    if (totalCount !== null && all.length >= totalCount) break
    if (pageNum > PAGE_SAFETY_CEILING) break
    await new Promise(r => setTimeout(r, NAV_DELAY_MS))
    const { rows, totalCount: tc } = await scrapeOnePage(page, semester, pageNum)
    if (rows.length === 0) break
    all.push(...rows)
    if (tc !== null) totalCount = tc
    pageNum++
  }
  console.log(`${semester}: scraped ${all.length}${totalCount ? ` / ${totalCount} reported` : ''} rows across ${pageNum} page(s)`)
  return all
}

// ── Raw archival snapshot ────────────────────────────────────────────────
// Full deduplicated (exact-duplicate rows only), sanitized raw scrape -- the
// source-of-truth pattern that remap-schedule-semester.mjs re-dates onto a
// different semester window.
function writeRawSchedule(path, rawRows) {
  const seen = new Set()
  const rows = []
  for (const r of rawRows) {
    const code = normalizeCourseCode(r.course_code)
    const row = [
      r.semester.trim(),
      code,
      sanitizeField(r.facilitator_name),
      r.email.trim().toLowerCase(),
      sanitizeField(r.faculty),
      sanitizeField(r.department),
      r.level.trim(),
      r.day.trim(),
      r.time.trim(),
    ]
    const key = row.join('|')
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(row)
  }
  writeCsv(path, ['semester', 'course_code', 'facilitator_name', 'email', 'faculty', 'department', 'level', 'day', 'time'], rows)
}

// ── Orchestration ────────────────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const allRawRows = []
  for (const semester of TARGET_SEMESTERS) {
    const rows = await fetchAllRows(page, semester)
    allRawRows.push(...rows)
  }
  await browser.close()

  const courseIndex = buildCourseIndex(COURSES)

  // Courses CSV: one row per unique matched course_code
  const uniqueCodes = [...new Set(allRawRows.map(r => normalizeCourseCode(r.course_code)))]
  const matchedCourseRows = []
  const unmatchedCourseCodes = []
  for (const code of uniqueCodes) {
    const m = crossReferenceCourse(code, courseIndex)
    if (m) matchedCourseRows.push([code, sanitizeField(m.title), m.credits, sanitizeField(m.programme), m.level, m.semester])
    else unmatchedCourseCodes.push(code)
  }
  writeCsv(COURSES_CSV, ['course_code', 'course_title', 'credit_units', 'programme', 'level', 'semester'], matchedCourseRows)

  // Lecturers CSV: aggregated by unique email
  const lecturerMap = aggregateLecturers(allRawRows)
  const lecturerRows = [...lecturerMap.values()].map(l =>
    [l.email, l.full_name, l.faculty, l.department, [...l.courseCodes].join(';')]
  )
  writeCsv(LECTURERS_CSV, ['email', 'full_name', 'faculty', 'department', 'courses'], lecturerRows)

  // Lectures CSV: dedupe schedule slots, then weekly-expand
  const { slots, unmatchedCodes: lectureUnmatched } = dedupeScheduleSlots(allRawRows, courseIndex)
  const lectureRows = expandToWeeklyLectures(slots, FACILITATION_START, FACILITATION_END)
  writeCsv(LECTURES_CSV, ['course_code', 'course_title', 'facilitator_name', 'start_time', 'end_time', 'meeting_web_url', 'venue', 'meeting_platform', 'semester', 'academic_session'], lectureRows)

  // Unmatched report
  const allUnmatched = [...new Set([...unmatchedCourseCodes, ...lectureUnmatched])].sort()
  writeUnmatchedReport(UNMATCHED_TXT, allUnmatched)

  // Raw archival snapshot(s) -- one file per scraped semester
  for (const semester of TARGET_SEMESTERS) {
    const semesterRows = allRawRows.filter(r => r.semester.trim() === semester)
    writeRawSchedule(`${CSV_FILES_DIR}noun_facilitation_schedule_${semester}.csv`, semesterRows)
  }

  // Summary
  console.log(`\n── Summary ──────────────────────────────`)
  console.log(`Raw rows scraped:          ${allRawRows.length}`)
  console.log(`Unique course codes seen:  ${uniqueCodes.length}`)
  console.log(`  matched:                 ${matchedCourseRows.length}`)
  console.log(`  unmatched (see report):  ${allUnmatched.length}`)
  console.log(`Unique lecturers found:    ${lecturerMap.size}`)
  console.log(`Schedule slots (deduped):  ${slots.length}`)
  console.log(`Lecture rows generated:    ${lectureRows.length}`)
  console.log(`Output dir: ${OUTPUT_DIR}`)
  console.log(`Raw schedule snapshot(s):  ${CSV_FILES_DIR}`)
  console.log(`\nUpload order in Admin UI: 1) courses.csv  2) lecturers.csv (approve/activate lecturers)  3) lectures.csv`)
  console.log(`Uploading out of order will cause rows to silently skip ("Course not found" / unresolved facilitator).`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
