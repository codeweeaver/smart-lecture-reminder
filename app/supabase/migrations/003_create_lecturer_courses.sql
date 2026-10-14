-- Maps lecturers to the courses they are assigned to teach
create table if not exists public.lecturer_courses (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid references public.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  academic_session text not null,
  assigned_at timestamptz default now(),
  unique(lecturer_id, course_id, academic_session)
);
