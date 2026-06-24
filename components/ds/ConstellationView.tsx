'use client';

import { useRef, useEffect, useState, useTransition } from 'react';
import { GoalConstellation, ConstellationGoal, ConstellationSphere } from './GoalConstellation';
import { DecomposeModal } from './DecomposeModal';
import { getGoalTasks, toggleTaskDone, type GoalTask } from '@/app/actions/tasks';
import { CalendarSyncMenu } from './CalendarSyncMenu';

interface Props {
  goals: ConstellationGoal[];
  spheres: ConstellationSphere[];
}

type View = 'all' | 'upcoming' | 'closed';
const VIEWS: [View, string][] = [['all', 'Всі'], ['upcoming', 'Майбутні'], ['closed', 'Закриті']];

function ViewTabs({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: 3, background: 'hsl(var(--surface-sunken))', borderRadius: 'var(--radius-pill)', padding: 4, marginTop: 14 }}>
      {VIEWS.map(([v, l]) => {
        const on = view === v;
        return (
          <button key={v} onClick={() => onView(v)} style={{
            padding: '7px 16px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13.5,
            background: on ? 'hsl(var(--surface-card))' : 'transparent',
            color: on ? 'hsl(var(--text-strong))' : 'hsl(var(--text-muted))',
            boxShadow: on ? 'var(--shadow-xs)' : 'none',
            transition: 'all .18s ease',
          }}>{l}</button>
        );
      })}
    </div>
  );
}

function Legend({ spheres, filter, onFilter }: {
  spheres: ConstellationSphere[];
  filter: string | null;
  onFilter: (k: string | null) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {spheres.map(s => {
        const on = filter === s.key;
        const dim = filter && !on;
        return (
          <button key={s.key} onClick={() => onFilter(on ? null : s.key)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', padding: '6px 11px', borderRadius: 'var(--radius-pill)', border: 'none',
            background: on ? `hsl(var(--sphere-${s.key}-soft))` : 'transparent',
            color: on ? `hsl(var(--sphere-${s.key}))` : 'hsl(var(--text-body))',
            opacity: dim ? 0.4 : 1,
            transition: 'opacity .2s ease, background .2s ease, color .2s ease',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: `hsl(var(--sphere-${s.key}))`, boxShadow: `0 0 0 3px hsl(var(--sphere-${s.key}) / .14)`, flexShrink: 0 }} />
            <span style={{ fontSize: 15 }}>{s.icon as string}</span>
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

function GoalPanel({ goal, spheres, onClose, onDecompose, onProgressChange }: {
  goal: ConstellationGoal;
  spheres: ConstellationSphere[];
  onClose: () => void;
  onDecompose: () => void;
  onProgressChange: (goalId: string, done: number, total: number) => void;
}) {
  const sp  = spheres.find(s => s.key === goal.sphere);
  const col  = `hsl(var(--sphere-${goal.sphere}))`;
  const soft = `hsl(var(--sphere-${goal.sphere}-soft))`;

  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startToggle] = useTransition();

  useEffect(() => {
    if (!goal.id) { setLoading(false); return; }
    setLoading(true);
    getGoalTasks(goal.id).then(t => { setTasks(t); setLoading(false); }).catch(() => setLoading(false));
  }, [goal.id]);

  const doneCount  = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;
  const prog = totalCount > 0 ? doneCount / totalCount : 0;

  function handleToggle(taskId: string, isDone: boolean) {
    setTasks(ts => {
      const next = ts.map(t => t.id === taskId ? { ...t, status: isDone ? 'done' : 'active' } : t);
      const done  = next.filter(t => t.status === 'done').length;
      onProgressChange(goal.id!, done, next.length);
      return next;
    });
    startToggle(async () => {
      try { await toggleTaskDone(taskId, isDone); }
      catch {
        setTasks(ts => {
          const rollback = ts.map(t => t.id === taskId ? { ...t, status: isDone ? 'active' : 'done' } : t);
          const done = rollback.filter(t => t.status === 'done').length;
          onProgressChange(goal.id!, done, rollback.length);
          return rollback;
        });
      }
    });
  }

  function fmtDeadline(d: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  }

  return (
    <aside style={{
      position: 'absolute', top: 0, right: 0, height: '100%', width: 432,
      background: 'hsl(var(--surface-card))',
      boxShadow: '-18px 0 48px hsl(28 16% 10% / .16)',
      zIndex: 19, display: 'flex', flexDirection: 'column',
      animation: 'panelIn .42s cubic-bezier(.32,.9,.3,1)',
    }}>
      {/* Sphere chip + close */}
      <div style={{ padding: '22px 26px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px 6px 10px', borderRadius: 'var(--radius-pill)',
          background: soft, color: col, fontSize: 13.5, fontWeight: 600,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: col }} />
          <span>{sp?.icon as string}</span>
          {sp?.name}
        </span>
        <button onClick={onClose} aria-label="Закрити" style={{
          width: 36, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'hsl(var(--surface-sunken))', color: 'hsl(var(--text-muted))',
          fontSize: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      {/* Title + deadline */}
      <div style={{ padding: '18px 26px 0' }}>
        <h2 style={{ font: 'var(--font-goal-title)', color: 'hsl(var(--text-strong))', letterSpacing: '-0.02em', lineHeight: 1.12 }}>
          {goal.title}
        </h2>
        <div style={{ marginTop: 10 }}>
          {goal.overdue ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 500, color: 'hsl(var(--overdue))' }}>
              ⚠ прострочено · м'яко перепланувати
            </span>
          ) : goal.note ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'hsl(var(--text-muted))' }}>
              ● дедлайн {goal.note}
            </span>
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'hsl(var(--text-faint))' }}>
              ● без дедлайну
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--text-muted))' }}>
                {doneCount} з {totalCount} кроків
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: col }}>
                {Math.round(prog * 100)}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'hsl(var(--border-subtle))' }}>
              <div style={{ height: '100%', borderRadius: 999, background: col, width: `${prog * 100}%`, transition: 'width .5s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 8px', marginTop: 8 }}>
        {/* Header */}
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'hsl(var(--text-faint))', padding: '0 8px 8px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Кроки</span>
          {totalCount > 0 && <span style={{ color: col }}>{doneCount}/{totalCount}</span>}
        </div>

        {loading && (
          <div style={{ padding: '24px 8px', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'hsl(var(--text-faint))', textAlign: 'center' }}>
            Завантаження…
          </div>
        )}

        {!loading && totalCount === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 18px', borderRadius: 'var(--radius-lg)', background: 'hsl(var(--surface-sunken))', margin: '4px 8px' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{sp?.icon as string}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14.5, color: 'hsl(var(--text-strong))' }}>Ще не розбито на кроки</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'hsl(var(--text-muted))', marginTop: 4, lineHeight: 1.5 }}>
              Велика ціль стає легшою, коли поділена на 3–5 конкретних задач.
            </div>
          </div>
        )}

        {!loading && tasks.map((t, i) => {
          const isDone = t.status === 'done';
          const dl = fmtDeadline(t.deadline);
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => handleToggle(t.id, !isDone)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleToggle(t.id, !isDone); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 11,
                padding: '11px 10px', borderRadius: 'var(--radius-md)',
                background: isDone ? soft : 'transparent', cursor: 'pointer',
                textAlign: 'left', marginBottom: 4,
                transition: 'background .18s ease',
              }}
            >
              {/* Checkbox circle */}
              <span style={{
                width: 22, height: 22, borderRadius: 999, flexShrink: 0, marginTop: 1,
                border: `2px solid ${isDone ? col : 'hsl(var(--border-strong))'}`,
                background: isDone ? col : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .18s ease',
              }}>
                {isDone && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: isDone ? 500 : 600,
                  color: isDone ? 'hsl(var(--text-muted))' : 'hsl(var(--text-strong))',
                  textDecoration: isDone ? 'line-through' : 'none',
                  lineHeight: 1.4,
                }}>
                  {t.specific}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  {dl && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: isDone ? 'hsl(var(--text-faint))' : 'hsl(var(--text-muted))' }}>
                      до {dl}
                    </span>
                  )}
                  {t.recurrence !== 'none' && (
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
                      color: col, background: soft, padding: '1px 7px', borderRadius: 999,
                    }}>
                      {t.recurrence === 'daily' ? 'щодня' : t.recurrence === 'weekdays' ? 'по будніх' : t.recurrence === 'weekly' ? 'щотижня' : 'щомісяця'}
                    </span>
                  )}
                  {t.deadline && !isDone && (
                    <span onClick={e => e.stopPropagation()} style={{ lineHeight: 1 }}>
                      <CalendarSyncMenu
                        label=""
                        events={[{
                          uid: t.id,
                          title: t.specific,
                          date: t.deadline.slice(0, 10),
                          description: `Ціль: ${goal.title}`,
                          rrule: t.recurrence !== 'none'
                            ? { daily: 'RRULE:FREQ=DAILY', weekdays: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'RRULE:FREQ=WEEKLY', monthly: 'RRULE:FREQ=MONTHLY' }[t.recurrence]
                            : undefined,
                        }]}
                      />
                    </span>
                  )}
                </div>
              </div>
              {/* Step number */}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, flexShrink: 0,
                color: isDone ? col : 'hsl(var(--text-faint))', marginTop: 3,
              }}>
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div style={{ padding: '14px 26px 26px', borderTop: '1px solid hsl(var(--border-subtle))' }}>
        <button onClick={onDecompose} style={{
          width: '100%', padding: '13px 20px', borderRadius: 'var(--radius-md)',
          border: 'none', cursor: 'pointer',
          background: col, color: '#fff',
          fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 4px 16px hsl(var(--sphere-${goal.sphere}) / .35)`,
        }}>
          <span style={{ fontSize: 17, lineHeight: 1 }}>✦</span>
          {totalCount > 0 ? 'Додати ще кроки' : 'Розбити на кроки'}
        </button>
      </div>
    </aside>
  );
}

export function ConstellationView({ goals: initialGoals, spheres }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [goals, setGoals] = useState<ConstellationGoal[]>(initialGoals);
  const [dims, setDims] = useState({ w: 1180, h: 680 });
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [decomposeGoal, setDecomposeGoal] = useState<ConstellationGoal | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [view, setView] = useState<View>('all');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  function handleProgressChange(goalId: string, done: number, total: number) {
    setGoals(gs => gs.map(g =>
      g.id === goalId
        ? { ...g, progress: total > 0 ? done / total : 0, done, total }
        : g
    ));
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => {
      const { width, height } = e[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(undefined); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Filter goals by sphere and view
  const shown = goals.filter(g => {
    if (filter && g.sphere !== filter) return false;
    if (view === 'closed') return g.progress != null && g.progress >= 1;
    if (view === 'upcoming') return !g.overdue;
    return true;
  });

  const openGoal = selectedId ? goals.find(g => g.id === selectedId) : null;

  const today = new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: 'hsl(var(--background))' }}>
      <style>{`
        @keyframes panelIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { aside { animation: none !important; } }
      `}</style>

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 56% 60% at 50% 56%, hsl(36 40% 99%) 0%, hsl(var(--background)) 46%, hsl(36 24% 96.5%) 100%)',
      }} />

      {/* Header */}
      <header style={{
        position: 'relative',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24,
        padding: '26px 40px 22px', flexShrink: 0,
      }}>
        <div>
          <div style={{ font: 'var(--font-caption)', color: 'hsl(var(--text-muted))', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'capitalize' }}>
            {today}
          </div>
          <h1 style={{ font: 'var(--font-h1)', color: 'hsl(var(--text-strong))', letterSpacing: '-0.03em', marginTop: 3 }}>
            Мій простір
          </h1>
          <ViewTabs view={view} onView={setView} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingTop: 4 }}>
          <Legend spheres={spheres} filter={filter} onFilter={setFilter} />

          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label="Тема" style={{
              width: 40, height: 40, flexShrink: 0, borderRadius: 999, cursor: 'pointer',
              border: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--surface-card))',
              color: 'hsl(var(--text-body))', fontSize: 18,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {theme === 'dark' ? '☀︎' : '☾'}
          </button>
        </div>
      </header>

      {/* Constellation */}
      <div ref={containerRef} style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GoalConstellation
          key={view + ':' + (filter ?? 'all')}
          goals={shown}
          spheres={spheres}
          width={dims.w}
          height={dims.h}
          selectedId={selectedId}
          onSelect={g => setSelectedId(g?.id ?? undefined)}
        />

        {/* Scrim */}
        {openGoal && (
          <div onClick={() => setSelectedId(undefined)} style={{
            position: 'absolute', inset: 0,
            background: 'hsl(28 16% 10% / .14)',
            backdropFilter: 'blur(1.5px)',
            zIndex: 18,
          }} />
        )}

        {/* Goal drawer */}
        {openGoal && (
          <GoalPanel
            goal={openGoal}
            spheres={spheres}
            onClose={() => setSelectedId(undefined)}
            onDecompose={() => { setDecomposeGoal(openGoal); setSelectedId(undefined); }}
            onProgressChange={handleProgressChange}
          />
        )}
      </div>

      {/* SMART decompose modal */}
      {decomposeGoal && (
        <DecomposeModal
          goal={decomposeGoal}
          spheres={spheres}
          onClose={() => setDecomposeGoal(null)}
        />
      )}
    </div>
  );
}
