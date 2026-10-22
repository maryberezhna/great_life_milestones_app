-- Sphere runs without login (single user, see lib/auth.ts), so requests come in as anon
-- and auth.uid() is null: every direct update/insert/delete was silently rejected.
-- Let the site write rows of that one user only.

CREATE POLICY app_user_write ON public.plan_goals FOR ALL TO anon
  USING (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c')
  WITH CHECK (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c');

CREATE POLICY app_user_write ON public.spheres FOR ALL TO anon
  USING (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c')
  WITH CHECK (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c');

CREATE POLICY app_user_write ON public.plan_tasks FOR ALL TO anon
  USING (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c')
  WITH CHECK (user_id = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c');
