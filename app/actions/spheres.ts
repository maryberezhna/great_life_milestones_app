'use server';

import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';

export async function createSphere(
  name: string,
  icon: string,
  color: string,
): Promise<string> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();

  // get max sort_order
  const { data: last } = await supabase
    .from('spheres')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('spheres')
    .insert({
      user_id: userId,
      name: name.trim(),
      icon: icon.trim() || '⭐',
      color,
      sort_order: (last?.sort_order ?? 0) + 1,
      archived: false,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateSphere(
  id: string,
  data: { name?: string; icon?: string; color?: string },
): Promise<void> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (data.name  !== undefined) patch.name  = data.name.trim();
  if (data.icon  !== undefined) patch.icon  = data.icon.trim() || '⭐';
  if (data.color !== undefined) patch.color = data.color;
  const { error } = await supabase
    .from('spheres')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function deleteSphere(id: string): Promise<{ ok: boolean; reason?: string }> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();

  // Check if sphere has active goals
  const { count } = await supabase
    .from('plan_goals')
    .select('id', { count: 'exact', head: true })
    .eq('sphere_id', id)
    .eq('user_id', userId)
    .neq('status', 'archived');

  if (count && count > 0) {
    return { ok: false, reason: `Є ${count} активних цілей у цій сфері` };
  }

  const { error } = await supabase
    .from('spheres')
    .update({ archived: true })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
