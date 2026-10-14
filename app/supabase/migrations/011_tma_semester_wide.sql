-- Migrate tma_deadlines to semester-wide deadlines (run once on existing DB)
-- NOUN sets one TMA deadline per semester, not per course.

-- Drop the old per-course unique constraint
ALTER TABLE public.tma_deadlines
  DROP CONSTRAINT IF EXISTS tma_deadlines_course_id_tma_number_academic_session_key;

-- Make course_code nullable (it is no longer meaningful)
ALTER TABLE public.tma_deadlines
  ALTER COLUMN course_code DROP NOT NULL;

-- Add the new semester-wide unique constraint
ALTER TABLE public.tma_deadlines
  ADD CONSTRAINT tma_deadlines_tma_number_academic_session_key
  UNIQUE (tma_number, academic_session);
