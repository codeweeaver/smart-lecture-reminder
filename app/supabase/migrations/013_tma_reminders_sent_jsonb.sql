-- Replace single reminder_sent boolean with per-window JSONB tracking.
-- This allows the 24h AND 1h TMA windows to each fire independently.
-- The old reminder_sent column is preserved (nullable) for backward compatibility.
ALTER TABLE public.tma_deadlines
  ADD COLUMN IF NOT EXISTS reminders_sent jsonb DEFAULT '{}';

-- Fix notification_preferences default to include "reminders": true.
-- Previously missing, causing the send-reminders function to skip all users
-- who had never manually saved their Settings page.
ALTER TABLE public.users
  ALTER COLUMN notification_preferences
  SET DEFAULT '{"enabled": true, "reminders": true, "reminder_minutes": [30, 15, 5], "announcements": true, "tma": true}';
