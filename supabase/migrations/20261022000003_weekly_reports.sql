-- Weekly reports are kept after generation (and can be deleted)
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report      jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weekly_reports_user_created ON public.weekly_reports (user_id, created_at DESC);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- same single-user access as the other tables (see 20261022000002_app_user_write.sql)
CREATE POLICY app_user_all ON public.weekly_reports FOR ALL TO anon
  USING (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c')
  WITH CHECK (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c');
