/**
 * NOUN Full Course Catalogue Seed
 * Run: node --env-file=.env.local seed-courses.mjs
 *
 * Inserts every course offered at NOUN across all faculties,
 * programmes, and levels (100–500), both semesters.
 */

import { createClient } from "@supabase/supabase-js";
import { COURSES, colour } from "./nounCourses.data.mjs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌  Missing env vars. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SESSION = "2026_2";

// ─────────────────────────────────────────────
// INSERT via Supabase JS client (service role)
// ─────────────────────────────────────────────

const rows = COURSES.map(
  ([code, title, credits, programme, level, semester]) => ({
    course_code: code,
    course_title: title,
    credit_units: credits,
    programme,
    level,
    semester,
    academic_session: SESSION,
    color_hex: colour(code),
  }),
);

const BATCH = 50;
let inserted = 0,
  failed = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const label = `courses ${i + 1}–${Math.min(i + BATCH, rows.length)}`;
  const { error } = await supabase
    .from("courses")
    .upsert(batch, { onConflict: "course_code" });
  if (error) {
    console.error(`[ERR] ${label}: ${error.message}`);
    failed += batch.length;
  } else {
    console.log(`[OK] ${label}`);
    inserted += batch.length;
  }
}

console.log(`\nDone! ${inserted} courses inserted/updated, ${failed} failed.`);
console.log(`Total courses in catalogue: ${COURSES.length}`);
