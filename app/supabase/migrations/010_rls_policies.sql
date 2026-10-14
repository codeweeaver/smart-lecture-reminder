-- ============================================================
-- Helper functions (SECURITY DEFINER to avoid recursive RLS)
-- ============================================================
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_admin_or_lecturer()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'lecturer'))
$$;

-- ============================================================
-- Row Level Security  enable on all tables first
-- ============================================================
alter table public.users           enable row level security;
alter table public.courses         enable row level security;
alter table public.lecturer_courses enable row level security;
alter table public.lectures        enable row level security;
alter table public.enrollments     enable row level security;
alter table public.attendance      enable row level security;
alter table public.tma_deadlines   enable row level security;
alter table public.notifications   enable row level security;
alter table public.app_settings    enable row level security;

-- ============================================================
-- USERS
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename='users' and policyname='Users read own') then
    create policy "Users read own" on public.users for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='users' and policyname='Users update own') then
    create policy "Users update own" on public.users for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='users' and policyname='Admin full access users') then
    create policy "Admin full access users" on public.users for all using (public.is_admin());
  end if;
end $$;

-- ============================================================
-- COURSES
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename='courses' and policyname='All read courses') then
    create policy "All read courses" on public.courses for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='courses' and policyname='Admin writes courses') then
    create policy "Admin writes courses" on public.courses for all using (public.is_admin());
  end if;
end $$;

-- ============================================================
-- LECTURER_COURSES
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename='lecturer_courses' and policyname='All read lecturer_courses') then
    create policy "All read lecturer_courses" on public.lecturer_courses for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='lecturer_courses' and policyname='Admin writes lecturer_courses') then
    create policy "Admin writes lecturer_courses" on public.lecturer_courses for all using (public.is_admin());
  end if;
end $$;

-- ============================================================
-- LECTURES  (all auth read; admin or assigned lecturer write)
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename='lectures' and policyname='All read lectures') then
    create policy "All read lectures" on public.lectures for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='lectures' and policyname='Admin writes lectures') then
    create policy "Admin writes lectures" on public.lectures for all using (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='lectures' and policyname='Lecturer updates own lectures') then
    create policy "Lecturer updates own lectures" on public.lectures for update using (facilitator_id = auth.uid());
  end if;
end $$;

-- ============================================================
-- ENROLLMENTS
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename='enrollments' and policyname='User owns enrollments') then
    create policy "User owns enrollments" on public.enrollments for all using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='enrollments' and policyname='Admin reads all enrollments') then
    create policy "Admin reads all enrollments" on public.enrollments for select using (public.is_admin());
  end if;
end $$;

-- ============================================================
-- ATTENDANCE
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename='attendance' and policyname='User owns attendance') then
    create policy "User owns attendance" on public.attendance for all using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='attendance' and policyname='Admin lecturer read attendance') then
    create policy "Admin lecturer read attendance" on public.attendance for select using (public.is_admin_or_lecturer());
  end if;
end $$;

-- ============================================================
-- TMA_DEADLINES
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename='tma_deadlines' and policyname='All read tma') then
    create policy "All read tma" on public.tma_deadlines for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='tma_deadlines' and policyname='Admin writes tma') then
    create policy "Admin writes tma" on public.tma_deadlines for all using (public.is_admin());
  end if;
end $$;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='User reads own notifications') then
    create policy "User reads own notifications" on public.notifications for all using (user_id = auth.uid());
  end if;
end $$;

-- ============================================================
-- APP_SETTINGS
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where tablename='app_settings' and policyname='All read settings') then
    create policy "All read settings" on public.app_settings for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='app_settings' and policyname='Admin writes settings') then
    create policy "Admin writes settings" on public.app_settings for all using (public.is_admin());
  end if;
end $$;

-- ============================================================
-- REALTIME   enable on lectures and notifications tables
-- ============================================================
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'lectures'
  ) then
    alter publication supabase_realtime add table public.lectures;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
