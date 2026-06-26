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
  '#14B8A6': 'teal',
  '#F97316': 'clay',
  '#6366F1': 'indigo',
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

// ── Ideas ─────────────────────────────────────────────────────────────────

export interface Idea {
  id: string;
  title: string;
  sphere_id: string | null;
  created_at: string;
}

export async function getIdeas(): Promise<Idea[]> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from('plan_goals')
    .select('id, title, sphere_id, created_at')
    .eq('user_id', userId)
    .eq('status', 'idea')
    .order('created_at', { ascending: false });
  return (data ?? []) as Idea[];
}

export async function createIdea(title: string, sphereId?: string): Promise<string> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_goals')
    .insert({ user_id: userId, title: title.trim(), status: 'idea', sphere_id: sphereId ?? null })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteIdea(ideaId: string): Promise<void> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { error } = await supabase
    .from('plan_goals')
    .delete()
    .eq('id', ideaId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function promoteIdeaToGoal(ideaId: string, sphereId: string): Promise<{ id: string; title: string; sphere_id: string }> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_goals')
    .update({ status: 'active', sphere_id: sphereId })
    .eq('id', ideaId)
    .eq('user_id', userId)
    .select('id, title, sphere_id')
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; title: string; sphere_id: string };
}

// ── Status ────────────────────────────────────────────────────────────────

export async function setGoalStatus(
  goalId: string,
  status: 'active' | 'paused' | 'done' | 'archived',
): Promise<void> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_goals')
    .update({ status })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select('id');
  if (error) throw new Error(error.message);
  // If RLS blocked the update, data is null/empty — treat as error so optimistic UI rolls back
  if (!data || data.length === 0) throw new Error('No rows updated — check RLS or goal ownership');
}

export async function setGoalSprint(goalId: string, isSprint: boolean): Promise<void> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  if (isSprint) {
    // clear existing sprint for this user's goals first (only one sprint at a time per sphere)
    const { data: goal } = await supabase
      .from('plan_goals')
      .select('sphere_id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();
    if (goal?.sphere_id) {
      await supabase
        .from('plan_goals')
        .update({ is_sprint: false })
        .eq('user_id', userId)
        .eq('sphere_id', goal.sphere_id)
        .neq('id', goalId);
    }
  }
  const { error } = await supabase
    .from('plan_goals')
    .update({ is_sprint: isSprint })
    .eq('id', goalId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
