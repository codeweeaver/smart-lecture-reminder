-- Self-reported attendance per student per lecture
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  lecture_id uuid references public.lectures(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  status text not null,                           -- 'attended' | 'missed' | 'excused'
  note text,
  marked_at timestamptz default now(),
  unique(user_id, lecture_id)
);
