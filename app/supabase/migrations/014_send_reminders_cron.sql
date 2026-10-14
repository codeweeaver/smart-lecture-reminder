-- Schedules the send-reminders Edge Function to run every 5 minutes via pg_cron + pg_net,
-- replacing the old Netlify `[functions.send-reminders] schedule = "*/5 * * * *"` config.
--
-- The x-cron-secret header value is looked up from Supabase Vault at run time (secret name
-- 'cron_secret_header') rather than hardcoded here, so the raw CRON_SECRET never appears in
-- a git-tracked file. The secret itself must be created once, out of band, via:
--   select vault.create_secret('<CRON_SECRET-value>', 'cron_secret_header', '...');

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminders-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://rjumesgybjdxfpbzmjot.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_header')
    ),
    body := '{}'::jsonb
  );
  $$
);
