-- Goal dependencies: a goal can optionally depend on another goal
ALTER TABLE public.plan_goals
ADD COLUMN IF NOT EXISTS depends_on_id uuid REFERENCES public.plan_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS plan_goals_depends_on ON public.plan_goals (depends_on_id) WHERE depends_on_id IS NOT NULL;
