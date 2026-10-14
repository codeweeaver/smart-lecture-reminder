-- Users table  mirrors auth.users with app-specific profile fields
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  matric_number text,
  programme text,
  level integer,
  study_centre text,
  faculty text,
  department text,
  role text not null default 'student',          -- 'student' | 'lecturer' | 'admin'
  status text not null default 'active',          -- 'active' | 'pending' | 'suspended'
  push_subscriptions jsonb default '[]',
  notification_preferences jsonb default '{"enabled": true, "reminder_minutes": [30, 15, 5], "announcements": true, "tma": true}',
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    case
      when coalesce(new.raw_user_meta_data->>'role', 'student') = 'lecturer' then 'pending'
      else 'active'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
