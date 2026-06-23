'use server';

import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';

export interface GoalTask {
  id: string;
  specific: string;
  status: string;
  deadline: string | null;
  recurrence: string;
}

export async function getGoalTasks(goalId: string): Promise<GoalTask[]> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_goal_tasks', {
    p_goal_id: goalId,
    p_user_id: userId,
  });
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
  recurrence?: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
}

export async function createTasks(goalId: string, tasks: TaskInput[]) {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const p_tasks = tasks.map(t => ({
    specific:   t.specific,
    deadline:   t.deadline ? new Date(t.deadline + 'T12:00:00').toISOString() : null,
    recurrence: t.recurrence ?? 'none',
  }));
  const { error } = await supabase.rpc('insert_plan_tasks', {
    p_goal_id: goalId,
    p_user_id: userId,
    p_tasks,
  });
  if (error) throw new Error(error.message);
}
