'use server';

import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';

export interface Dream {
  id: string;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
}

export async function getDreams(): Promise<Dream[]> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_dreams', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return (data ?? []) as Dream[];
}

export async function addDream(title: string): Promise<string> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('add_dream', {
    p_user_id: userId,
    p_title: title.trim(),
    p_sort_order: 99,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function toggleDream(dreamId: string, done: boolean): Promise<void> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { error } = await supabase.rpc('toggle_dream', {
    p_dream_id: dreamId,
    p_user_id: userId,
    p_done: done,
  });
  if (error) throw new Error(error.message);
}
