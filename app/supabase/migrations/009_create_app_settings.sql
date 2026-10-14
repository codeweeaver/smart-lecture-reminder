-- Key-value store for global semester configuration
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Default semester values  update these each semester via Admin → Settings
insert into public.app_settings (key, value) values
  ('active_academic_session', '2025_2'),
  ('active_semester',         'second'),
  ('facilitation_start',      '2026-02-02'),
  ('facilitation_end',        '2026-08-30')
on conflict (key) do nothing;
