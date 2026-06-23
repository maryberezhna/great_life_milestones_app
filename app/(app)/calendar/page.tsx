import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';
import { CalendarSyncMenu } from '@/components/ds/CalendarSyncMenu';
import type { IcsEvent } from '@/lib/ics';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const HEX_TO_KEY: Record<string, string> = {
  '#8B5CF6': 'violet',
  '#F59E0B': 'amber',
  '#10B981': 'sage',
  '#EC4899': 'rose',
  '#3B82F6': 'blue',
};

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Mon=0 offset
  const startDow = (first.getDay() + 6) % 7;
  const days: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default async function CalendarPage() {
  const userId = await getRequiredUserId();
  const supabase = await createClient();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const monthLabel = now.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  const days = getCalendarDays(year, month);

  // Fetch tasks with deadlines in this month
  const monthStart = new Date(year, month, 1).toISOString();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: tasks } = await supabase
    .from('plan_tasks')
    .select(`
      id, specific, deadline, status, calendar_event_id,
      plan_goals!inner(id, title, sphere_id, spheres!inner(id, name, color, icon))
    `)
    .eq('user_id', userId)
    .in('status', ['active', 'postponed'])
    .gte('deadline', monthStart)
    .lte('deadline', monthEnd)
    .order('deadline');

  // Group by day
  const tasksByDay = new Map<number, typeof tasks>();
  for (const t of tasks ?? []) {
    const d = new Date(t.deadline!).getDate();
    const arr = tasksByDay.get(d) ?? [];
    arr.push(t);
    tasksByDay.set(d, arr);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid hsl(var(--border-subtle))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
              color: 'hsl(var(--text-muted))', textTransform: 'capitalize',
            }}>
              Планування
            </div>
            <h1 style={{
              fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 28,
              letterSpacing: '-0.02em', color: 'hsl(var(--text-strong))', marginTop: 2,
              textTransform: 'capitalize',
            }}>
              {monthLabel}
            </h1>
          </div>
          {(tasks?.length ?? 0) > 0 && (() => {
            const icsEvents: IcsEvent[] = (tasks ?? [])
              .filter((t: any) => t.deadline)
              .map((t: any) => ({
                uid: t.id,
                title: t.specific,
                date: t.deadline!.slice(0, 10),
                description: `Ціль: ${(t.plan_goals as any)?.title ?? ''}`,
              }));
            return <CalendarSyncMenu events={icsEvents} label="Додати в календар" />;
          })()}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: 760 }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 12,
                fontWeight: 600, color: 'hsl(var(--text-faint))',
                padding: '6px 0', letterSpacing: '0.04em',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {days.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} style={{ minHeight: 80 }} />;
              }
              const isToday = day === today;
              const dayTasks = tasksByDay.get(day) ?? [];

              return (
                <div key={day} style={{
                  minHeight: 80, padding: '8px 8px 6px',
                  borderRadius: 'var(--radius-md)',
                  background: isToday ? 'hsl(var(--primary-soft))' : 'hsl(var(--surface-card))',
                  border: `1px solid ${isToday ? 'hsl(var(--primary))' : 'hsl(var(--border-subtle))'}`,
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                    marginBottom: 4,
                  }}>
                    {day}
                  </div>
                  {dayTasks.slice(0, 2).map((t: any) => {
                    const sphere = Array.isArray(t.plan_goals?.spheres) ? t.plan_goals.spheres[0] : t.plan_goals?.spheres;
                    const k = HEX_TO_KEY[sphere?.color ?? ''] ?? 'violet';
                    return (
                      <div key={t.id} style={{
                        fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 500,
                        color: `hsl(var(--sphere-${k}))`,
                        background: `hsl(var(--sphere-${k}-soft))`,
                        borderRadius: 4, padding: '2px 5px', marginBottom: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {t.specific}
                      </div>
                    );
                  })}
                  {dayTasks.length > 2 && (
                    <div style={{ fontSize: 10, color: 'hsl(var(--text-faint))', fontFamily: 'var(--font-mono)', paddingLeft: 2 }}>
                      +{dayTasks.length - 2}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tasks with deadlines this month */}
          {(tasks?.length ?? 0) > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'hsl(var(--text-faint))', marginBottom: 12,
              }}>
                Задачі цього місяця
              </div>
              <div style={{
                background: 'hsl(var(--surface-card))',
                border: '1px solid hsl(var(--border-subtle))',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              }}>
                {tasks!.map((t: any, i: number) => {
                  const sphere = Array.isArray(t.plan_goals?.spheres) ? t.plan_goals.spheres[0] : t.plan_goals?.spheres;
                  const k = HEX_TO_KEY[sphere?.color ?? ''] ?? 'violet';
                  const accent = `hsl(var(--sphere-${k}))`;
                  const d = new Date(t.deadline!).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < tasks!.length - 1 ? '1px solid hsl(var(--border-subtle))' : 'none',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: accent, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                          color: 'hsl(var(--text-strong))',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {t.specific}
                        </div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 2 }}>
                          {sphere?.icon} {sphere?.name} · {t.plan_goals?.title}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 12, color: accent,
                        background: `hsl(var(--sphere-${k}-soft))`,
                        padding: '3px 8px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                      }}>
                        {d}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(tasks?.length ?? 0) === 0 && (
            <div style={{
              marginTop: 32, border: '2px dashed hsl(var(--border-subtle))',
              borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center',
              fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--text-muted))',
            }}>
              Задач з дедлайнами цього місяця немає
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
