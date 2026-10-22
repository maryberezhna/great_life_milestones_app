-- Which calendar «Додати в календар» sends steps to — chosen once in «Календар».
-- Only the choice lives here; Google refresh tokens stay in google_calendar_credentials
-- (service role only, encrypted).
CREATE TABLE IF NOT EXISTS public.calendar_settings (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      text NOT NULL CHECK (provider IN ('google', 'apple')),
  connected_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;

-- same single-user access as the other tables (see 20261022000002_app_user_write.sql)
CREATE POLICY app_user_all ON public.calendar_settings FOR ALL TO anon
  USING (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c')
  WITH CHECK (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c');
