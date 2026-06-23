import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';
import { AppShell } from '@/components/ds/AppShell';
import { TaskReminders } from '@/components/ds/TaskReminders';

const NAV = [
  { href: '/dashboard', icon: '⊞', label: 'Головна' },
  { href: '/calendar', icon: '◫', label: 'Календар' },
  { href: '/report', icon: '◈', label: 'Звіт' },
  { href: '/backlog', icon: '✦', label: 'Просто мрії' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getRequiredUserId();
  const supabase = await createClient();

  const [{ data: spheres }, { data: { user } }] = await Promise.all([
    supabase
      .from('sphere_summary')
      .select('id, name, color, icon, is_active, active_goal_count, sort_order')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('sort_order'),
    supabase.auth.getUser(),
  ]);

  return (
    <>
      <AppShell
        nav={NAV}
        spheres={spheres ?? []}
        userEmail={user?.email ?? null}
      >
        {children}
      </AppShell>
      <TaskReminders />
    </>
  );
}
