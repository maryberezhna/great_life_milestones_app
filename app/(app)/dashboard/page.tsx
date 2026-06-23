import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';
import { ConstellationView } from '@/components/ds/ConstellationView';
import type { ConstellationGoal, ConstellationSphere } from '@/components/ds/GoalConstellation';

const HEX_TO_KEY: Record<string, string> = {
  '#8B5CF6': 'violet',
  '#F59E0B': 'amber',
  '#10B981': 'sage',
  '#EC4899': 'rose',
  '#3B82F6': 'blue',
};

function complexityToWeight(c: string | null): number {
  if (c === 'hard')   return 5;
  if (c === 'medium') return 3;
  return 1;
}

function deadlineNote(d: string | null): { note?: string; overdue: boolean } {
  if (!d) return { overdue: false };
  const days = (new Date(d).getTime() - Date.now()) / 86_400_000;
  if (days <= 0) return { note: 'прострочено', overdue: true };
  if (days < 30) return { note: `${Math.round(days)} дн.`, overdue: false };
  if (days < 90) return { note: new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }), overdue: false };
  return { overdue: false };
}

export default async function DashboardPage() {
  const userId = await getRequiredUserId();
  const supabase = await createClient();

  const [{ data: spheresRaw }, { data: goalsRaw }, { data: tasksRaw }] = await Promise.all([
    supabase.from('spheres')
      .select('id, name, color, icon, sort_order')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('sort_order'),
    supabase.from('plan_goals')
      .select('id, title, sphere_id, target_date, complexity')
      .eq('user_id', userId)
      .eq('status', 'active'),
    supabase.from('plan_tasks')
      .select('goal_id, status')
      .eq('user_id', userId)
      .neq('status', 'irrelevant'),
  ]);

  const spheresData = (spheresRaw ?? []) as { id: string; name: string; color: string; icon: string }[];
  const goalsData  = (goalsRaw  ?? []) as { id: string; title: string; sphere_id: string; target_date: string | null; complexity: string | null }[];
  const tasksData  = (tasksRaw  ?? []) as { goal_id: string | null; status: string }[];

  // compute progress per goal: done / total (excluding irrelevant)
  const tasksByGoal = new Map<string, { done: number; total: number }>();
  for (const t of tasksData) {
    if (!t.goal_id) continue;
    const cur = tasksByGoal.get(t.goal_id) ?? { done: 0, total: 0 };
    tasksByGoal.set(t.goal_id, {
      done:  cur.done  + (t.status === 'done' ? 1 : 0),
      total: cur.total + 1,
    });
  }

  const sphereById = new Map(spheresData.map(s => [s.id, s]));

  const spheres: ConstellationSphere[] = spheresData.map(s => ({
    key: HEX_TO_KEY[s.color] ?? 'violet',
    name: s.name,
    icon: s.icon ?? '',
  }));

  const goals: ConstellationGoal[] = goalsData.map(g => {
    const s = sphereById.get(g.sphere_id);
    const { note, overdue } = deadlineNote(g.target_date);
    const td = tasksByGoal.get(g.id) ?? { done: 0, total: 0 };
    return {
      id: g.id,
      title: g.title,
      sphere: HEX_TO_KEY[s?.color ?? ''] ?? 'violet',
      weight: complexityToWeight(g.complexity),
      note,
      overdue,
      progress: td.total > 0 ? td.done / td.total : 0,
      done: td.done,
      total: td.total,
    };
  });

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <ConstellationView goals={goals} spheres={spheres} />
    </div>
  );
}
