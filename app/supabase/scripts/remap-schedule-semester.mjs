/**
 * Re-labels an archived raw facilitation-schedule snapshot onto a different
 * semester, keeping every field identical except `semester`. The course
 * assignments, day/time slots, and lecturer emails are the same real NOUN
 * pattern -- only the semester tag changes, so downstream (build-live-csvs.mjs)
 * dates the schedule against the CURRENTLY ACTIVE semester's calendar window
 * instead of the one that already passed.
 *
 * Run: node supabase/scripts/remap-schedule-semester.mjs
 */

import { readFileSync, writeFileSync } from 'fs'

const FROM_SEMESTER = '2026_1'
const TO_SEMESTER = '2026_2'

const CSV_FILES_DIR = new URL('../../csv-files/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const SOURCE_PATH = `${CSV_FILES_DIR}noun_facilitation_schedule_${FROM_SEMESTER}.csv`
const TARGET_PATH = `${CSV_FILES_DIR}noun_facilitation_schedule_${TO_SEMESTER}.csv`

function parseCsvLine(line) {
  // Simple split is safe here: the raw schedule snapshot's own writer
  // already sanitizes every field to remove literal commas before writing.
  return line.split(',')
}

function main() {
  const raw = readFileSync(SOURCE_PATH, 'utf8').trim().split('\n')
  const header = raw[0]
  const cols = parseCsvLine(header)
  const semesterIdx = cols.indexOf('semester')
  if (semesterIdx === -1) {
    throw new Error(`Could not find a "semester" column in ${SOURCE_PATH}`)
  }

  let remapped = 0
  const outLines = [header]
  for (const line of raw.slice(1)) {
    const fields = parseCsvLine(line)
    if (fields[semesterIdx] === FROM_SEMESTER) {
      fields[semesterIdx] = TO_SEMESTER
      remapped++
    }
    outLines.push(fields.join(','))
  }

  writeFileSync(TARGET_PATH, outLines.join('\n') + '\n', 'utf8')
  console.log(`Read ${raw.length - 1} row(s) from ${SOURCE_PATH}`)
  console.log(`Remapped ${remapped} row(s): semester ${FROM_SEMESTER} -> ${TO_SEMESTER}`)
  console.log(`Wrote ${outLines.length - 1} row(s) -> ${TARGET_PATH}`)
}

main()
