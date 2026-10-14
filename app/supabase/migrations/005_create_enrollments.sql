-- Student enrollments  one row per student per course per session
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  course_code text not null,
  semester text not null,
  academic_session text not null,
  custom_color text,
  reminder_override integer[],
  expired boolean default false,
  enrolled_at timestamptz default now(),
  unique(user_id, course_id, academic_session)
);
