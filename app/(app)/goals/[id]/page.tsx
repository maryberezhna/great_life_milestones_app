import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddTaskDialog } from './add-task-dialog';
import { GoalTaskItem } from '@/components/ds/GoalTaskItem';
import { ProgressBar } from '@/components/ds/ProgressBar';
import { GoalStatusToggle } from '@/components/ds/GoalStatusToggle';
import { SprintToggle } from '@/components/ds/SprintToggle';

const HEX_TO_KEY: Record<string, string> = {
  '#8B5CF6': 'violet',
  '#F59E0B': 'amber',
  '#10B981': 'sage',
  '#EC4899': 'rose',
  '#3B82F6': 'blue',
};

type TaskStatus = 'active' | 'postponed' | 'done' | 'irrelevant';

interface Task {
  id: string;
  specific: string;
  action: string | null;
  result: string | null;
  deadline: string | null;
  status: TaskStatus;
  calendar_event_id: string | null;
}

interface GoalWithSphere {
  id: string;
  title: string;
  description: string | null;
  status: string;
  is_sprint: boolean;
  target_date: string | null;
  spheres: { id: string; name: string; color: string | null; icon: string | null }[] | null;
}

function calcStreak(doneTasks: { updated_at: string }[]): number {
  if (!doneTasks.length) return 0;
  const getWeekStart = (d: Date) => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon.getTime();
  };
  const weeksWithDone = new Set(doneTasks.map(t => getWeekStart(new Date(t.updated_at))));
  let streak = 0;
  let week = getWeekStart(new Date());
  while (weeksWithDone.has(week)) {
    streak++;
    week -= 7 * 86_400_000;
  }
  return streak;
}

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getRequiredUserId();
  const supabase = await createClient();

  const [{ data: goal }, { data: tasksRaw }] = await Promise.all([
    supabase
      .from('plan_goals')
      .select('id, title, description, status, is_sprint, target_date, spheres(id, name, color, icon)')
      .eq('id', id)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('plan_tasks')
      .select('id, specific, action, result, deadline, status, calendar_event_id, updated_at')
      .eq('goal_id', id)
      .order('created_at'),
  ]);

  if (!goal) notFound();

  const g = goal as unknown as GoalWithSphere;
  const sphere = Array.isArray(g.spheres) ? g.spheres[0] : g.spheres;
  const tasks = (tasksRaw ?? []) as Task[];

  const key = HEX_TO_KEY[sphere?.color ?? ''] ?? 'violet';
  const accent = `hsl(var(--sphere-${key}))`;
  const soft = `hsl(var(--sphere-${key}-soft))`;

  const activeTasks = tasks.filter(t => t.status === 'active' || t.status === 'postponed');
  const doneTasks = tasks.filter(t => t.status === 'done' || t.status === 'irrelevant');

  const totalCount = tasks.filter(t => t.status !== 'irrelevant').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const isQuickWin = totalCount > 0 && totalCount <= 3 && doneCount < totalCount;
  const streak = calcStreak(tasks.filter(t => t.status === 'done').map(t => ({ updated_at: (t as any).updated_at })));

  const deadline = g.target_date
    ? new Date(g.target_date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px 20px', borderBottom: '1px solid hsl(var(--border-subtle))' }}>
        {/* Breadcrumb */}
        {sphere && (
          <Link href={`/spheres/${sphere.id}`} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-sans)', fontSize: 13,
              color: 'hsl(var(--text-muted))', marginBottom: 14, cursor: 'pointer',
            }}>
              ← {sphere.icon} {sphere.name}
            </div>
          </Link>
        )}

        {/* Goal title */}
        <h1 style={{
          fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 24,
          letterSpacing: '-0.02em', color: 'hsl(var(--text-strong))', lineHeight: 1.25,
        }}>
          {g.title}
        </h1>

        {g.description && (
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.55,
            color: 'hsl(var(--text-muted))', marginTop: 8,
          }}>
            {g.description}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <GoalStatusToggle goalId={id} currentStatus={g.status} />
          <SprintToggle goalId={id} isSprint={g.is_sprint ?? false} accent={accent} soft={soft} />
          {isQuickWin && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 'var(--radius-pill)',
              background: 'hsl(var(--sphere-sage-soft, #D1FAE5))',
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700,
              color: 'hsl(var(--sphere-sage, #059669))',
            }}>
              ✓ Quick Win
            </span>
          )}
          {deadline && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
              color: accent, background: soft,
              padding: '4px 10px', borderRadius: 'var(--radius-sm)',
            }}>
              до {deadline}
            </span>
          )}
          {totalCount > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--text-muted))' }}>
              {doneCount} / {totalCount} кроків
            </span>
          )}
          {streak > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
              color: 'hsl(var(--text-muted))',
            }}>
              🔥 {streak} {streak === 1 ? 'тиждень' : streak < 5 ? 'тижні' : 'тижнів'} в русі
            </span>
          )}
        </div>

        {/* Progress */}
        {totalCount > 0 && (
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={doneCount} max={totalCount} color={accent} height={4} />
          </div>
        )}
      </div>

      {/* Tasks */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', maxWidth: 720 }}>
        {/* Tasks header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'hsl(var(--text-faint))',
          }}>
            Кроки
          </div>
          <AddTaskDialog goalId={id} />
        </div>

        {tasks.length === 0 ? (
          <div style={{
            border: '2px dashed hsl(var(--border-subtle))', borderRadius: 'var(--radius-lg)',
            padding: 40, textAlign: 'center',
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--text-muted))',
          }}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Ціль ще без кроків</div>
            <div style={{ fontSize: 13, color: 'hsl(var(--text-faint))' }}>
              Натисни «+ Крок», щоб додати конкретні дії
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Active tasks */}
            {activeTasks.length > 0 && (
              <div style={{
                background: 'hsl(var(--surface-card))',
                border: '1px solid hsl(var(--border-subtle))',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}>
                {activeTasks.map(t => (
                  <GoalTaskItem
                    key={t.id}
                    id={t.id}
                    goalId={id}
                    specific={t.specific}
                    action={t.action}
                    deadline={t.deadline}
                    status={t.status}
                    calendarEventId={t.calendar_event_id}
                    accent={accent}
                  />
                ))}
              </div>
            )}

            {/* Done / irrelevant */}
            {doneTasks.length > 0 && (
              <div>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: 'hsl(var(--text-faint))', marginBottom: 8,
                }}>
                  Завершені
                </div>
                <div style={{
                  background: 'hsl(var(--surface-card))',
                  border: '1px solid hsl(var(--border-subtle))',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden', opacity: 0.6,
                }}>
                  {doneTasks.map(t => (
                    <GoalTaskItem
                      key={t.id}
                      id={t.id}
                      goalId={id}
                      specific={t.specific}
                      action={t.action}
                      deadline={t.deadline}
                      status={t.status}
                      calendarEventId={t.calendar_event_id}
                      accent={accent}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
