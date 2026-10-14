/**
 * Shared, pure transform pipeline for turning raw NOUN facilitation-timetable
 * rows into the app's bulk-import CSV shapes. Used by both the live scraper
 * (scrape-facilitation-timetable.mjs) and the offline rebuild scripts that
 * re-date an already-scraped schedule onto a different semester window
 * (remap-schedule-semester.mjs, build-live-csvs.mjs). No side effects other
 * than writeCsv/writeUnmatchedReport, which write to whatever path they're given.
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'

export const DAY_OFFSETS = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }

// ── Parsing / normalization ─────────────────────────────────────────────
export function parseTimeRange(str) {
  const m = String(str).trim().match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+(AM|PM|NOON)$/i)
  if (!m) return null
  let [, startRaw, endRaw, suffix] = m
  let start = parseInt(startRaw, 10)
  let end = parseInt(endRaw, 10)
  suffix = suffix.toUpperCase()

  if (suffix === 'NOON') {
    return { startHour: start === 12 ? 12 : start, endHour: 12 }
  }
  const to24 = (h, isPM) => isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h)
  const isPM = suffix === 'PM'
  return { startHour: to24(start, isPM), endHour: to24(end, isPM) }
}

export function sanitizeField(str) {
  if (str == null) return ''
  return String(str)
    .replace(/\r?\n/g, ' ')
    .replace(/,/g, ';')
    .replace(/"/g, "'")
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeCourseCode(raw) {
  const compact = String(raw).trim().toUpperCase().replace(/\s+/g, '')
  const m = compact.match(/^([A-Z]+)(\d+)$/)
  return m ? `${m[1]} ${m[2]}` : compact
}

// ── Cross-reference ──────────────────────────────────────────────────────
export function buildCourseIndex(coursesArray) {
  const index = new Map()
  for (const [code, title, credits, programme, level, semester] of coursesArray) {
    index.set(normalizeCourseCode(code), { title, credits, programme, level, semester })
  }
  return index
}

export function crossReferenceCourse(rawCode, index) {
  return index.get(normalizeCourseCode(rawCode)) ?? null
}

// The facilitation-timetable scrape has no title/credit-unit columns at all —
// those only exist for the ~119 codes that happen to match the small curated
// nounCourses.data.mjs catalogue. For every other real, currently-running
// NOUN course, synthesize the best honest placeholder from data the scrape
// actually has, rather than excluding a real course just because a small
// hand-curated list doesn't know its title. Level is derived from the course
// code's own leading digit (standard Nigerian tertiary numbering — e.g.
// "CIT 403" -> 400) since the scraped "Level" column is a NOUN-internal tier
// code on a different scale, not the app's 100-400 one.
export function deriveFallbackCourseInfo(code, rawRow) {
  const digits = code.match(/(\d+)$/)?.[1] ?? ''
  const firstDigit = digits ? parseInt(digits[0], 10) : 0
  const level = firstDigit >= 1 && firstDigit <= 4 ? firstDigit * 100 : 400
  const semSuffix = String(rawRow?.semester ?? '').split('_')[1]
  return {
    title: code,
    credits: 2,
    programme: sanitizeField(rawRow?.department) || sanitizeField(rawRow?.faculty) || 'General Studies',
    level,
    semester: semSuffix === '1' ? 'first' : 'second',
  }
}

// ── Lecturer aggregation ─────────────────────────────────────────────────
// Some raw NOUN rows list multiple emails in one cell, semicolon-separated
// (duplicates of the same address, or a co-facilitator's address) — only a
// single valid address can be submitted to create-lecturer, so pick the
// first one that looks like an email.
function firstValidEmail(raw) {
  const candidates = String(raw).split(/[;,]/).map(s => s.trim()).filter(Boolean)
  return (candidates.find(c => c.includes('@')) ?? candidates[0] ?? '').toLowerCase()
}

export function aggregateLecturers(rawRows) {
  const byEmail = new Map()
  for (const r of rawRows) {
    const email = firstValidEmail(r.email)
    if (!email) continue
    const code = normalizeCourseCode(r.course_code)
    if (!byEmail.has(email)) {
      byEmail.set(email, {
        email,
        full_name: sanitizeField(r.facilitator_name),
        faculty: sanitizeField(r.faculty),
        department: sanitizeField(r.department),
        courseCodes: new Set(),
      })
    }
    byEmail.get(email).courseCodes.add(code)
  }
  return byEmail
}

// ── Weekly expansion ─────────────────────────────────────────────────────
// `unmatchedCodes` here means "used the fallback derivation" — the slot is
// still included, just without real catalogue title/credits.
export function dedupeScheduleSlots(rawRows, courseIndex) {
  const slots = new Map()
  const unmatchedCodes = new Set()
  for (const r of rawRows) {
    const code = normalizeCourseCode(r.course_code)
    let match = crossReferenceCourse(code, courseIndex)
    if (!match) {
      match = deriveFallbackCourseInfo(code, r)
      unmatchedCodes.add(code)
    }
    const time = parseTimeRange(r.time)
    if (!time) { console.warn(`[skip] unparseable time "${r.time}" for ${code}`); continue }
    const key = `${code}|${r.facilitator_name.trim()}|${r.day.trim()}|${time.startHour}`
    if (!slots.has(key)) {
      slots.set(key, {
        course_code: code,
        course_title: sanitizeField(match.title),
        facilitator_name: sanitizeField(r.facilitator_name),
        day: r.day.trim(),
        startHour: time.startHour,
        endHour: time.endHour,
        semester: r.semester,
      })
    }
  }
  return { slots: [...slots.values()], unmatchedCodes }
}

export function addDays(datePart, n) {
  const d = new Date(datePart + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function firstOccurrenceOnOrAfter(startDateStr, targetDayOffset) {
  const d = new Date(startDateStr + 'T12:00:00Z')
  const currentOffset = (d.getUTCDay() + 6) % 7 // JS getUTCDay: 0=Sun..6=Sat -> convert to 0=Mon..6=Sun
  const delta = (targetDayOffset - currentOffset + 7) % 7
  return addDays(startDateStr, delta)
}

export function expandToWeeklyLectures(slots, start, end) {
  const pad = n => String(n).padStart(2, '0')
  const endDate = new Date(end + 'T12:00:00Z')
  const out = []
  for (const slot of slots) {
    const dayOffset = DAY_OFFSETS[slot.day]
    if (dayOffset === undefined) { console.warn(`[skip] unknown day "${slot.day}"`); continue }

    const firstDate = firstOccurrenceOnOrAfter(start, dayOffset)
    let cursor = 0
    while (true) {
      const date = addDays(firstDate, cursor)
      if (new Date(date + 'T12:00:00Z') > endDate) break
      const semSuffix = slot.semester.split('_')[1]
      out.push([
        slot.course_code,
        slot.course_title,
        slot.facilitator_name,
        `${date}T${pad(slot.startHour)}:00:00`,
        `${date}T${pad(slot.endHour)}:00:00`,
        '',            // meeting_web_url — not available from source site
        '',            // venue — not available from source site
        'zoom',        // meeting_platform
        semSuffix === '1' ? 'first' : 'second',
        slot.semester, // academic_session — NOUN's own code IS the app's session format
      ])
      cursor += 7
    }
  }
  return out
}

// ── Output ───────────────────────────────────────────────────────────────
export function writeCsv(path, headers, rowsOfArrays) {
  const headerLine = headers.join(',')
  const lines = rowsOfArrays.map(row => row.map(cell => sanitizeField(cell)).join(','))
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, [headerLine, ...lines].join('\n') + '\n', 'utf8')
  console.log(`Wrote ${lines.length} row(s) -> ${path}`)
}

export function writeUnmatchedReport(path, unmatchedCodes) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, unmatchedCodes.join('\n') + '\n', 'utf8')
  console.log(`Wrote ${unmatchedCodes.length} unmatched code(s) -> ${path}`)
}
