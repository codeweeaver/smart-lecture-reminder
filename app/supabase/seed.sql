-- ============================================================
-- NOUN Smart Lecture Reminder  Seed Data
-- Run this AFTER all 10 migration files.
--
-- HOW TO USE:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste and run this file
--   3. Separately create the admin auth user via:
--        Authentication → Users → Add user
--   4. Then promote them to admin (see bottom of this file)
-- ============================================================

-- ============================================================
-- COURSES   400-level Computer Science, Second Semester 2025/2026
-- ============================================================
insert into public.courses
  (course_code, course_title, credit_units, programme, level, semester, academic_session, color_hex)
values
  ('CIT 401', 'Design and Analysis of Algorithms',  3, 'Computer Science', 400, 'second', '2025_2', '#0d5c34'),
  ('CIT 403', 'Software Engineering',               3, 'Computer Science', 400, 'second', '2025_2', '#1a9a5c'),
  ('CIT 405', 'Artificial Intelligence',            3, 'Computer Science', 400, 'second', '2025_2', '#127a46'),
  ('CIT 407', 'Computer Graphics',                  3, 'Computer Science', 400, 'second', '2025_2', '#3db57a'),
  ('CIT 409', 'Human Computer Interaction',         3, 'Computer Science', 400, 'second', '2025_2', '#72ce9e'),
  ('GST 301', 'Introduction to Entrepreneurship',   2, 'Computer Science', 400, 'second', '2025_2', '#e8b824'),
  ('CIT 302', 'Data Communications and Networking', 3, 'Computer Science', 300, 'second', '2025_2', '#f97316'),
  ('CIT 304', 'Systems Analysis and Design',        3, 'Computer Science', 300, 'second', '2025_2', '#3b82f6')
on conflict (course_code) do nothing;

-- ============================================================
-- APP SETTINGS   active semester config
-- ============================================================
insert into public.app_settings (key, value) values
  ('active_academic_session', '2026_2'),
  ('active_semester',         'second'),
  ('facilitation_start',      '2026-07-06'),
  ('facilitation_end',        '2026-10-31')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ============================================================
-- SAMPLE LECTURES   fill in real Zoom URLs before use
-- ============================================================
-- These reference courses by code. You need to look up the
-- course UUIDs first. Alternatively, create lectures via the
-- Admin Panel in the app (recommended).
--
-- To create lectures programmatically, run the app and use
-- Admin → Lectures → New Lecture for each session.

-- ============================================================
-- PROMOTE ADMIN USER
-- After creating the admin account via Supabase Authentication:
--   Authentication → Users → Add user (e.g. admin@noun.edu.ng)
-- Run the following query (replace the email with yours):
--
-- UPDATE public.users
-- SET role = 'admin', status = 'active', onboarding_complete = true
-- WHERE email = 'admin@noun.edu.ng';
--
-- ============================================================
