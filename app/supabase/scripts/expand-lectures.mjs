// Regenerates lectures-bulk.csv from the unique courses already in the file.
// Matches real NOUN facilitation structure (from actual faculty timetable PDFs):
//   - 1-hour sessions (not 2 hours)
//   - 9 hourly time slots per day: 09:00–18:00
//   - 6 days per week: Mon–Sat
//   - 54 total (day, slot) combinations → sparse, realistic student calendar
//   - Weekly recurring for 17 weeks: Jul 6 – Oct 31, 2026 (covers Jul 1 – Oct 30)

import { readFileSync, writeFileSync } from 'fs'

const CSV_PATH = new URL('./lectures-bulk.csv', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

// ── 1. Parse CSV ──────────────────────────────────────────────────────────────

const raw = readFileSync(CSV_PATH, 'utf8').trim().split('\n')
const header = raw[0]
const cols = header.split(',')

function parseRow(line) {
  const fields = []
  let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { fields.push(cur); cur = '' }
    else cur += ch
  }
  fields.push(cur)
  return Object.fromEntries(cols.map((c, i) => [c, (fields[i] ?? '').trim()])  )
}

// ── 2. Extract unique courses (first occurrence per course_code) ──────────────

const seen = new Set()
const courses = raw.slice(1).map(parseRow).filter(r => {
  const code = r.course_code?.trim().toUpperCase()
  if (!code || seen.has(code)) return false
  seen.add(code)
  return true
})

console.log(`Unique courses extracted: ${courses.length}`)

// ── 3. Build 54 slot combinations (6 days × 9 hourly slots) ──────────────────
// dayOffset: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat
// startHour: 9, 10, 11, 12, 13, 14, 15, 16, 17  (end = start + 1)

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]
const SLOTS = []
for (let d = 0; d < 6; d++) {
  for (const h of HOURS) {
    SLOTS.push([d, h])
  }
}
// → 54 entries

// ── 4. UTC-safe date helper ───────────────────────────────────────────────────

function addDays(datePart, n) {
  const d = new Date(datePart + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── 5. Generate rows ──────────────────────────────────────────────────────────

const WEEKS = 17                  // week 0 = Jul 6, week 16 = Oct 26–31 (covers Oct 30)
const FACIL_START = '2026-07-06'  // Monday, first full week of July 2026

const output = [header]
let zoomSeq = 8000200001

courses.forEach((course, idx) => {
  const [dayOffset, hStart] = SLOTS[idx % SLOTS.length]
  const pad = n => String(n).padStart(2, '0')

  for (let w = 0; w < WEEKS; w++) {
    const date = addDays(FACIL_START, w * 7 + dayOffset)
    const startStr = `${date}T${pad(hStart)}:00:00`
    const endStr   = `${date}T${pad(hStart + 1)}:00:00`
    const meetingUrl = `https://zoom.us/j/${zoomSeq++}`

    output.push([
      course.course_code,
      course.course_title,
      course.facilitator_name,
      startStr,
      endStr,
      meetingUrl,
      course.venue || 'Online',
      course.meeting_platform || 'zoom',
      course.semester,
      course.academic_session,
    ].join(','))
  }
})

// ── 6. Write output ───────────────────────────────────────────────────────────

writeFileSync(CSV_PATH, output.join('\n') + '\n', 'utf8')

const totalRows = output.length - 1
console.log(`Done. ${totalRows} rows written (${courses.length} courses × ${WEEKS} weeks)`)
console.log(`File: ${CSV_PATH}`)

// ── 7. Spot-check: show first CIT course's 8 sessions ────────────────────────

const citCourse = courses.find(c => c.course_code.startsWith('CIT'))
if (citCourse) {
  const citIdx = courses.indexOf(citCourse)
  const [slotDay, slotHour] = SLOTS[citIdx % SLOTS.length]
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  console.log(`\nSpot-check: ${citCourse.course_code} → ${dayNames[slotDay]} ${pad2(slotHour)}:00–${pad2(slotHour + 1)}:00 (slot index ${citIdx % SLOTS.length})`)
  for (let w = 0; w < WEEKS; w++) {
    console.log(`  Week ${w + 1}: ${addDays(FACIL_START, w * 7 + slotDay)}T${pad2(slotHour)}:00:00`)
  }
}

function pad2(n) { return String(n).padStart(2, '0') }
