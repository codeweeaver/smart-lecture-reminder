-- Individual lecture sessions scheduled for a course
create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  course_code text not null,
  course_title text not null,
  color_hex text not null,
  facilitator_id uuid references public.users(id),
  facilitator_name text not null,
  venue text,
  meeting_platform text default 'zoom',           -- 'zoom' | 'google_meet' | 'other'
  meeting_web_url text,
  meeting_deep_link text,
  meeting_id text,
  recording_url text,
  announcement text,                              -- short lecturer message (max 280 chars)
  announcement_sent boolean default false,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'scheduled',                -- 'scheduled' | 'cancelled' | 'rescheduled' | 'completed'
  cancel_reason text,
  rescheduled_from timestamptz,
  notifications_sent jsonb default '{"30min": false, "15min": false, "5min": false}',
  study_centre text,
  semester text not null,
  academic_session text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Keep updated_at current on every update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lectures_updated_at on public.lectures;
create trigger lectures_updated_at
  before update on public.lectures
  for each row execute procedure public.set_updated_at();
