/**
 * Rebuilds the app's live Admin -> Bulk Import CSVs (csv-files/courses.csv,
 * lecturers.csv, lectures-bulk.csv) from an already-remapped raw schedule
 * snapshot, replacing the old synthetic demo data with the real scraped NOUN
 * pattern re-dated onto the CURRENTLY ACTIVE semester's calendar window.
 *
 * Run: node supabase/scripts/build-live-csvs.mjs
 */

import { readFileSync } from 'fs'
import { COURSES } from './nounCourses.data.mjs'
import {
  normalizeCourseCode, sanitizeField,
  buildCourseIndex, crossReferenceCourse, deriveFallbackCourseInfo,
  aggregateLecturers, dedupeScheduleSlots, expandToWeeklyLectures,
  writeCsv, writeUnmatchedReport,
} from './scheduleTransform.mjs'

// ── Config ───────────────────────────────────────────────────────────────
const SEMESTER = '2026_2'
// Real NOUN 2026_2 semester window, per the user's portal screenshot --
// NOT the old 2026-10-31 guess reset-demo.mjs previously hardcoded.
const FACILITATION_START = '2026-07-06'
const FACILITATION_END   = '2026-11-25'

const CSV_FILES_DIR = new URL('../../csv-files/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const SOURCE_PATH        = `${CSV_FILES_DIR}noun_facilitation_schedule_${SEMESTER}.csv`
const COURSES_CSV        = `${CSV_FILES_DIR}courses.csv`
const LECTURERS_CSV      = `${CSV_FILES_DIR}lecturers.csv`
const LECTURES_BULK_CSV  = `${CSV_FILES_DIR}lectures-bulk.csv`
const UNMATCHED_TXT      = `${CSV_FILES_DIR}unmatched-courses.txt`

function readRawSchedule(path) {
  const raw = readFileSync(path, 'utf8').trim().split('\n')
  const header = raw[0].split(',')
  return raw.slice(1).map(line => {
    const fields = line.split(',')
    const row = Object.fromEntries(header.map((h, i) => [h, (fields[i] ?? '').trim()]))
    return row // { semester, course_code, facilitator_name, email, faculty, department, level, day, time }
  })
}

function main() {
  const allRawRows = readRawSchedule(SOURCE_PATH)
  console.log(`Read ${allRawRows.length} row(s) from ${SOURCE_PATH}`)

  const courseIndex = buildCourseIndex(COURSES)

  // One representative raw row per code (for the fallback derivation's
  // department/faculty/semester lookup), built in a single pass.
  const sampleRowByCode = new Map()
  for (const r of allRawRows) {
    const code = normalizeCourseCode(r.course_code)
    if (!sampleRowByCode.has(code)) sampleRowByCode.set(code, r)
  }

  // Courses CSV: one row per unique course_code, real catalogue data where it
  // matches, an honest fallback (code-as-title, department-as-programme,
  // level from the code's own leading digit) for the rest — every course
  // NOUN is actually running this semester gets included, not just the ones
  // a small hand-curated catalogue happens to know.
  const uniqueCodes = [...new Set(allRawRows.map(r => normalizeCourseCode(r.course_code)))]
  const matchedCourseRows = []
  const unmatchedCourseCodes = []
  for (const code of uniqueCodes) {
    let m = crossReferenceCourse(code, courseIndex)
    if (!m) {
      m = deriveFallbackCourseInfo(code, sampleRowByCode.get(code))
      unmatchedCourseCodes.push(code)
    }
    matchedCourseRows.push([code, sanitizeField(m.title), m.credits, sanitizeField(m.programme), m.level, m.semester])
  }
  writeCsv(COURSES_CSV, ['course_code', 'course_title', 'credit_units', 'programme', 'level', 'semester'], matchedCourseRows)

  // Lecturers CSV: aggregated by unique email
  const lecturerMap = aggregateLecturers(allRawRows)
  const lecturerRows = [...lecturerMap.values()].map(l =>
    [l.email, l.full_name, l.faculty, l.department, [...l.courseCodes].join(';')]
  )
  writeCsv(LECTURERS_CSV, ['email', 'full_name', 'faculty', 'department', 'courses'], lecturerRows)

  // Lectures-bulk CSV: dedupe schedule slots, then weekly-expand across the
  // REAL currently-active facilitation window (not the archived semester's).
  const { slots, unmatchedCodes: lectureUnmatched } = dedupeScheduleSlots(allRawRows, courseIndex)
  const lectureRows = expandToWeeklyLectures(slots, FACILITATION_START, FACILITATION_END)
  writeCsv(LECTURES_BULK_CSV, ['course_code', 'course_title', 'facilitator_name', 'start_time', 'end_time', 'meeting_web_url', 'venue', 'meeting_platform', 'semester', 'academic_session'], lectureRows)

  // Report of codes that used the fallback derivation (no real catalogue title/credits)
  const allUnmatched = [...new Set([...unmatchedCourseCodes, ...lectureUnmatched])].sort()
  writeUnmatchedReport(UNMATCHED_TXT, allUnmatched)

  console.log(`\n── Summary ──────────────────────────────`)
  console.log(`Facilitation window:         ${FACILITATION_START} .. ${FACILITATION_END}`)
  console.log(`Unique course codes seen:    ${uniqueCodes.length}`)
  console.log(`  courses.csv rows written:  ${matchedCourseRows.length} (all included)`)
  console.log(`    real catalogue data:     ${matchedCourseRows.length - unmatchedCourseCodes.length}`)
  console.log(`    fallback data (no title): ${unmatchedCourseCodes.length} (see ${UNMATCHED_TXT})`)
  console.log(`Unique lecturers found:      ${lecturerMap.size}`)
  console.log(`Schedule slots (deduped):    ${slots.length}`)
  console.log(`Lecture rows generated:      ${lectureRows.length}`)
  console.log(`\nUpload order in Admin UI: 1) courses.csv  2) lecturers.csv (approve/activate lecturers)  3) lectures-bulk.csv`)
}

main()
