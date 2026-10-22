'use server';

import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';

export interface GoalTask {
  id: string;
  specific: string;
  status: string;
  deadline: string | null;
  recurrence: string;
  start_time: string | null;
}

export async function getGoalTasks(goalId: string): Promise<GoalTask[]> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_tasks')
    .select('id, specific, status, deadline, recurrence, start_time')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .neq('status', 'irrelevant')
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as GoalTask[];
}

export async function toggleTaskDone(taskId: string, done: boolean): Promise<void> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { error } = await supabase.rpc('toggle_task_done', {
    p_task_id: taskId,
    p_user_id: userId,
    p_done: done,
  });
  if (error) throw new Error(error.message);
}

export interface TaskInput {
  specific: string;
  deadline?: string; // YYYY-MM-DD
  time?: string;     // HH:MM
  recurrence?: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
}

// returns the new steps' ids, in the order given
export async function createTasks(goalId: string, tasks: TaskInput[]): Promise<string[]> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const rows = tasks
    .filter(t => t.specific.trim())
    .map(t => ({
      user_id: userId,
      goal_id: goalId,
      specific: t.specific,
      deadline: t.deadline ? new Date(t.deadline + 'T12:00:00').toISOString() : null,
      recurrence: t.recurrence ?? 'none',
      start_time: t.time || null,
      status: 'active' as const,
    }));
  const { data, error } = await supabase.from('plan_tasks').insert(rows).select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => r.id as string);
}

export async function setTaskTime(taskId: string, time: string | null): Promise<void> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { error } = await supabase.from('plan_tasks').update({ start_time: time || null }).eq('id', taskId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// the time of day the user picks most often — the default for new steps
export async function getUsualTime(): Promise<string> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data } = await supabase.from('plan_tasks').select('start_time').eq('user_id', userId).not('start_time', 'is', null).limit(500);
  const counts = new Map<string, number>();
  for (const r of data ?? []) counts.set(r.start_time as string, (counts.get(r.start_time as string) ?? 0) + 1);
  let best = '09:00', n = 0;
  counts.forEach((c, t) => { if (c > n) { best = t; n = c; } });
  return best;
}
