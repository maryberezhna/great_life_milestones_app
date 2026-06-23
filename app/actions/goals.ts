'use server';

import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';

export interface SphereOption {
  id: string;
  name: string;
  color: string;
  icon: string;
  key: string;
}

const HEX_TO_KEY: Record<string, string> = {
  '#8B5CF6': 'violet',
  '#F59E0B': 'amber',
  '#10B981': 'sage',
  '#EC4899': 'rose',
  '#3B82F6': 'blue',
};

export async function getSpheres(): Promise<SphereOption[]> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from('spheres')
    .select('id, name, color, icon')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('sort_order');
  return (data ?? []).map(s => ({
    id: s.id, name: s.name, color: s.color, icon: s.icon,
    key: HEX_TO_KEY[s.color] ?? 'violet',
  }));
}

export async function createGoalFromDream(
  title: string,
  sphereId: string,
  deadline?: string,
): Promise<string> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_goals')
    .insert({
      user_id: userId,
      sphere_id: sphereId,
      title,
      status: 'active',
      target_date: deadline || null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function setGoalStatus(
  goalId: string,
  status: 'active' | 'paused' | 'done' | 'archived',
): Promise<void> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { error } = await supabase
    .from('plan_goals')
    .update({ status })
    .eq('id', goalId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
