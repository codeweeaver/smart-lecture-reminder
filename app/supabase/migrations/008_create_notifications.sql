-- In-app notification log (mirrors what was pushed)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  lecture_id uuid references public.lectures(id) on delete cascade,
  course_code text not null,
  message text not null,
  type text not null,  -- 'reminder' | 'cancellation' | 'reschedule' | 'recording_added' | 'announcement' | 'tma_deadline'
  minutes_before integer,
  scheduled_for timestamptz,
  sent_at timestamptz,
  read boolean default false,
  meeting_link text,
  created_at timestamptz default now()
);
