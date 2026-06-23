import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const HEX_TO_KEY: Record<string, string> = {
  '#8B5CF6': 'violet',
  '#F59E0B': 'amber',
  '#10B981': 'sage',
  '#EC4899': 'rose',
  '#3B82F6': 'blue',
};

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('uk-UA', { month: 'short', year: 'numeric' });
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  plan_tasks: { count: number }[];
}

export default async function SpherePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getRequiredUserId();
  const supabase = await createClient();

  const [{ data: sphere }, { data: goalsRaw }] = await Promise.all([
    supabase.from('spheres').select('*').eq('id', id).eq('user_id', userId).single(),
    supabase
      .from('plan_goals')
      .select('id, title, description, status, target_date, plan_tasks(count)')
      .eq('sphere_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (!sphere) notFound();

  const goals = (goalsRaw ?? []) as Goal[];
  const active = goals.filter(g => g.status === 'active');
  const hold = goals.filter(g => g.status === 'paused' || g.status === 'hold');
  const done = goals.filter(g => g.status === 'done');

  const key = HEX_TO_KEY[sphere.color as string] ?? 'violet';
  const accent = `hsl(var(--sphere-${key}))`;
  const soft = `hsl(var(--sphere-${key}-soft))`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px 18px', borderBottom: '1px solid hsl(var(--border-subtle))' }}>
        {/* Breadcrumb */}
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--font-sans)', fontSize: 13,
            color: 'hsl(var(--text-muted))', marginBottom: 14, cursor: 'pointer',
          }}>
            ← Головна
          </div>
        </Link>

        {/* Sphere identity */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              {sphere.icon}
            </span>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 24,
                letterSpacing: '-0.02em', color: 'hsl(var(--text-strong))',
              }}>
                {sphere.name}
              </h1>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'hsl(var(--text-muted))', marginTop: 3,
              }}>
                {active.length} активних · {goals.length} всього
              </div>
            </div>
          </div>

          {/* Add goal button */}
          <button style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
            color: accent, background: soft,
            padding: '9px 18px', borderRadius: 'var(--radius-md)',
            border: 'none', cursor: 'pointer',
          }}>
            + Ціль
          </button>
        </div>
      </div>

      {/* Goals list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {goals.length === 0 ? (
          <div style={{
            border: '2px dashed hsl(var(--border-subtle))', borderRadius: 'var(--radius-lg)',
            padding: 48, textAlign: 'center', color: 'hsl(var(--text-muted))',
            fontFamily: 'var(--font-sans)', fontSize: 14,
          }}>
            Додайте першу ціль для цієї сфери
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <GoalGroup label="Активні" goals={active} accent={accent} soft={soft} />
            )}
            {hold.length > 0 && (
              <GoalGroup label="На паузі" goals={hold} accent={accent} soft={soft} muted />
            )}
            {done.length > 0 && (
              <GoalGroup label="Завершені" goals={done} accent={accent} soft={soft} muted />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GoalGroup({
  label, goals, accent, soft, muted = false,
}: {
  label: string;
  goals: Goal[];
  accent: string;
  soft: string;
  muted?: boolean;
}) {
  return (
    <div>
      {/* Section label */}
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'hsl(var(--text-faint))', marginBottom: 10,
      }}>
        {label}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {goals.map(g => {
          const taskCount = g.plan_tasks?.[0]?.count ?? 0;
          const deadline = formatDate(g.target_date);

          return (
            <Link key={g.id} href={`/goals/${g.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'hsl(var(--surface-card))',
                border: '1px solid hsl(var(--border-subtle))',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px',
                opacity: muted ? 0.65 : 1,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                {/* Color bar */}
                <span style={{
                  width: 3, height: 36, borderRadius: 2, flexShrink: 0,
                  background: muted ? 'hsl(var(--border-subtle))' : accent,
                }} />

                {/* Text */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15,
                    color: 'hsl(var(--text-strong))', lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {g.title}
                  </div>
                  {g.description && (
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontSize: 13,
                      color: 'hsl(var(--text-muted))', marginTop: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {g.description}
                    </div>
                  )}
                </div>

                {/* Trailing meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {taskCount > 0 && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      color: 'hsl(var(--text-muted))',
                    }}>
                      {taskCount} задач
                    </span>
                  )}
                  {deadline && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
                      color: muted ? 'hsl(var(--text-faint))' : accent,
                      background: soft, padding: '3px 9px', borderRadius: 'var(--radius-sm)',
                    }}>
                      {deadline}
                    </span>
                  )}
                  {!taskCount && !deadline && (
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                      color: accent, background: soft,
                      padding: '3px 9px', borderRadius: 'var(--radius-sm)',
                    }}>
                      + задачі
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
