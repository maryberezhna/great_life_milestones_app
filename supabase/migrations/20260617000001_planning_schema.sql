-- ============================================================
-- Planning Project — initial schema
-- Separate from great-life-milestones RN app tables
-- ============================================================

-- Enums
CREATE TYPE plan_task_status AS ENUM ('active', 'postponed', 'done', 'irrelevant');
CREATE TYPE plan_goal_status AS ENUM ('active', 'paused', 'done', 'archived');

-- ============================================================
-- spheres  (= life areas, replaces "topics" in RN app)
-- ============================================================
CREATE TABLE public.spheres (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name         text NOT NULL,
  color        text,                        -- hex color
  icon         text,                        -- emoji or icon name
  sort_order   smallint NOT NULL DEFAULT 0,
  is_backlog   boolean NOT NULL DEFAULT false,
  archived     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spheres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spheres_own" ON public.spheres FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- plan_goals
-- ============================================================
CREATE TABLE public.plan_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sphere_id   uuid REFERENCES public.spheres ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  status      plan_goal_status NOT NULL DEFAULT 'active',
  target_date date,                         -- nullable: "нечітка" ціль без дедлайну
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_goals_own" ON public.plan_goals FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- plan_tasks  (STAR: specific / action / result / deadline)
-- ============================================================
CREATE TABLE public.plan_tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  goal_id           uuid REFERENCES public.plan_goals ON DELETE CASCADE,
  specific          text NOT NULL,           -- що саме зробити
  action            text,                    -- яку дію виконати
  result            text,                    -- очікуваний результат
  deadline          timestamptz,
  status            plan_task_status NOT NULL DEFAULT 'active',
  calendar_event_id text,                    -- Google Calendar event id
  postponed_until   timestamptz,             -- якщо postponed
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_tasks_own" ON public.plan_tasks FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX ON public.spheres (user_id, sort_order);
CREATE INDEX ON public.plan_goals (user_id, sphere_id, status);
CREATE INDEX ON public.plan_tasks (user_id, goal_id, status);
CREATE INDEX ON public.plan_tasks (deadline) WHERE status = 'active';

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER plan_goals_updated_at
  BEFORE UPDATE ON public.plan_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER plan_tasks_updated_at
  BEFORE UPDATE ON public.plan_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- View: sphere_summary  (active = має хоч одну active ціль/задачу)
-- ============================================================
CREATE OR REPLACE VIEW public.sphere_summary
  WITH (security_invoker = true)
AS
SELECT
  s.id,
  s.user_id,
  s.name,
  s.color,
  s.icon,
  s.sort_order,
  s.is_backlog,
  s.archived,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'active')                    AS active_goal_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active')                    AS active_task_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active' AND t.deadline < now()) AS overdue_task_count,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'active') > 0
    OR COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') > 0            AS is_active
FROM public.spheres s
LEFT JOIN public.plan_goals g ON g.sphere_id = s.id AND g.user_id = s.user_id
LEFT JOIN public.plan_tasks t ON t.goal_id = g.id AND t.user_id = s.user_id
GROUP BY s.id;
