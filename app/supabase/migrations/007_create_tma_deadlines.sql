-- TMA deadlines are semester-wide  one deadline per TMA number, not per course
create table if not exists public.tma_deadlines (
  id uuid primary key default gen_random_uuid(),
  tma_number integer not null,                    -- 1 | 2 | 3
  due_date timestamptz not null,
  academic_session text not null,
  semester text not null,
  reminder_sent boolean default false,
  created_at timestamptz default now(),
  unique(tma_number, academic_session)
);
