-- Course catalogue  one row per course offered per semester/session
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null unique,
  course_title text not null,
  credit_units integer,
  programme text not null,
  level integer not null,
  semester text not null,                         -- 'first' | 'second'
  academic_session text not null,                 -- e.g. '2025_2'
  color_hex text default '#1a9a5c',
  enrollment_count integer default 0,
  created_at timestamptz default now()
);
