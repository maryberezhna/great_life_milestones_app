-- Each step keeps its own time of day (HH:MM, local) — used for calendar events and reminders
ALTER TABLE public.plan_tasks
  ADD COLUMN IF NOT EXISTS start_time text
  CHECK (start_time IS NULL OR start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
