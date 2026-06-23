'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const DEV_USER_ID = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c';

export async function createTask(formData: FormData) {
  const goalId = formData.get('goal_id') as string;
  const specific = formData.get('specific') as string;
  const action = formData.get('action') as string;
  const result = formData.get('result') as string;
  const deadline = formData.get('deadline') as string;

  if (!goalId || !specific) return { error: "Обов'язкові поля не заповнені" };

  const supabase = await createClient();
  const { error } = await supabase.from('plan_tasks').insert({
    user_id: DEV_USER_ID,
    goal_id: goalId,
    specific,
    action: action || null,
    result: result || null,
    deadline: deadline || null,
    status: 'active',
  });

  if (error) return { error: error.message };

  revalidatePath(`/goals/${goalId}`);
  return { success: true };
}

export async function updateTaskStatus(taskId: string, status: string, goalId: string) {
  const supabase = await createClient();
  await supabase
    .from('plan_tasks')
    .update({ status })
    .eq('id', taskId)
    .eq('user_id', DEV_USER_ID);

  revalidatePath(`/goals/${goalId}`);
}
