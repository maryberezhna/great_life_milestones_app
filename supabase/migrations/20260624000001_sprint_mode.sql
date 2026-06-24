-- Add sprint mode to plan_goals
-- Sprint = one goal marked as the current focus (contrast over balance principle)
ALTER TABLE public.plan_goals ADD COLUMN IF NOT EXISTS is_sprint boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS plan_goals_sprint ON public.plan_goals (user_id, is_sprint) WHERE is_sprint = true;
