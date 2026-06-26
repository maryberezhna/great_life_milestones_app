'use client';

import { useRef, useEffect, useState, useTransition } from 'react';
import React from 'react';
import { ConstellationGoal, ConstellationSphere } from './GoalConstellation';
import { ObsidianGraph } from './ObsidianGraph';
import { DecomposeModal } from './DecomposeModal';
import { getGoalTasks, toggleTaskDone, type GoalTask } from '@/app/actions/tasks';
import { setGoalStatus } from '@/app/actions/goals';
import { CalendarSyncMenu } from './CalendarSyncMenu';
import { EnergyCenterNode } from './EnergyCheckIn';
import { IdeasPanel } from './IdeasPanel';
import { SpheresModal } from './SpheresModal';

interface Props {
  goals: ConstellationGoal[];
  spheres: ConstellationSphere[];
}

type View = 'all' | 'paused' | 'upcoming' | 'closed';
const VIEWS: [View, string][] = [['all', 'Активні'], ['paused', 'На паузі'], ['upcoming', 'Майбутні'], ['closed', 'Завершені']];

function ViewTabs({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, background: 'hsl(var(--surface-sunken))', borderRadius: 'var(--radius-pill)', padding: 3 }}>
      {VIEWS.map(([v, l]) => {
        const on = view === v;
        return (
          <button key={v} onClick={() => onView(v)} data-no-brighten style={{
            padding: '5px 13px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12.5,
            background: on ? 'hsl(var(--surface-card))' : 'transparent',
            color: on ? 'hsl(var(--text-strong))' : 'hsl(var(--text-muted))',
            boxShadow: on ? 'var(--shadow-xs)' : 'none',
            opacity: on ? 1 : 0.65,
            transition: 'all .3s cubic-bezier(0.34,1.1,0.64,1)',
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
      {spheres.map(s => {
        const on = filter === s.key;
        const dim = filter && !on;
        return (
          <button key={s.key} onClick={() => onFilter(on ? null : s.key)} data-no-brighten
            title={s.name}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600,
              cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-pill)', border: 'none',
              background: on ? `hsl(var(--sphere-${s.key}-soft))` : 'transparent',
              color: on ? `hsl(var(--sphere-${s.key}))` : 'hsl(var(--text-body))',
              opacity: dim ? 0.3 : 1,
              transition: 'opacity .32s cubic-bezier(0.34,1.1,0.64,1), background .32s ease, color .32s ease, transform .32s cubic-bezier(0.34,1.3,0.64,1)',
              transform: on ? 'scale(1.06)' : 'scale(1)',
              whiteSpace: 'nowrap',
            }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: `hsl(var(--sphere-${s.key}))`, boxShadow: `0 0 0 2px hsl(var(--sphere-${s.key}) / .18)`, flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{s.icon as string}</span>
            <span style={{ fontSize: 12.5 }}>{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function GoalPanel({ goal, spheres, onClose, onDecompose, onProgressChange, onStatusChange, onDelete }: {
  goal: ConstellationGoal;
  spheres: ConstellationSphere[];
  onClose: () => void;
  onDecompose: () => void;
  onProgressChange: (goalId: string, done: number, total: number) => void;
  onStatusChange: (goalId: string, status: 'active' | 'paused') => void;
  onDelete: (goalId: string) => void;
}) {
  const sp  = spheres.find(s => s.key === goal.sphere);
  const col  = `hsl(var(--sphere-${goal.sphere}))`;
  const soft = `hsl(var(--sphere-${goal.sphere}-soft))`;

  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
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
      animation: 'panel-in .44s cubic-bezier(0.22, 1, 0.36, 1)',
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
              data-no-brighten
              onClick={() => handleToggle(t.id, !isDone)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleToggle(t.id, !isDone); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 11,
                padding: '11px 10px', borderRadius: 'var(--radius-md)',
                background: isDone ? soft : 'transparent', cursor: 'pointer',
                textAlign: 'left', marginBottom: 4,
                transition: 'background .22s ease, opacity .22s ease',
                opacity: isDone ? 0.72 : 1,
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
      <div style={{ padding: '14px 26px 26px', borderTop: '1px solid hsl(var(--border-subtle))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Pause / resume */}
        <button
          onClick={() => {
            if (!goal.id) return;
            const next = goal.status === 'paused' ? 'active' : 'paused';
            onStatusChange(goal.id, next);
            setGoalStatus(goal.id, next).catch(() => onStatusChange(goal.id!, goal.status === 'paused' ? 'paused' : 'active'));
          }}
          style={{
            width: '100%', padding: '11px 20px', borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${goal.status === 'paused' ? col : 'hsl(var(--border-subtle))'}`,
            cursor: 'pointer',
            background: goal.status === 'paused' ? soft : 'transparent',
            color: goal.status === 'paused' ? col : 'hsl(var(--text-muted))',
            fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all .18s ease',
          }}
        >
          {goal.status === 'paused' ? '▶ Відновити ціль' : '⏸ Поставити на паузу'}
        </button>

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

        {/* Delete */}
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            data-no-brighten
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
              color: 'hsl(var(--text-faint))', padding: '4px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'color .18s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--text-faint))'; }}
          >
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
              <path d="M1 3h11M4.5 3V2a1 1 0 011-1h2a1 1 0 011 1v1M5 5.5v4M8 5.5v4M2 3l.75 7a1 1 0 001 .75h5.5a1 1 0 001-.75L11 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Видалити ціль
          </button>
        ) : (
          <div style={{
            padding: '12px 14px', borderRadius: 'var(--radius-md)',
            background: 'hsl(0 60% 97%)', border: '1px solid hsl(0 60% 88%)',
            animation: 'fade-up .2s ease',
          }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#991b1b', marginBottom: 10, fontWeight: 500, lineHeight: 1.4 }}>
              Видалити «{goal.title}»? Усі кроки теж видаляться.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(false)} data-no-brighten style={{
                flex: 1, padding: '7px', borderRadius: 'var(--radius-md)',
                border: '1px solid hsl(var(--border-subtle))', background: '#fff',
                color: 'hsl(var(--text-muted))', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13,
              }}>Скасувати</button>
              <button
                onClick={() => {
                  if (!goal.id) return;
                  onDelete(goal.id);
                  setGoalStatus(goal.id, 'archived').catch(() => {/* already removed from UI */});
                }}
                style={{
                  flex: 1, padding: '7px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: '#dc2626', color: '#fff',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13,
                }}
              >Видалити</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export function ConstellationView({ goals: initialGoals, spheres }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [goals, setGoals] = useState<ConstellationGoal[]>(initialGoals);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [decomposeGoal, setDecomposeGoal] = useState<ConstellationGoal | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [view, setView] = useState<View>('all');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [spheresOpen, setSpheresOpen] = useState(false);

  function handleProgressChange(goalId: string, done: number, total: number) {
    setGoals(gs => gs.map(g =>
      g.id === goalId
        ? { ...g, progress: total > 0 ? done / total : 0, done, total }
        : g
    ));
  }

  function handleStatusChange(goalId: string, status: 'active' | 'paused') {
    setGoals(gs => gs.map(g => g.id === goalId ? { ...g, status } : g));
    setSelectedId(undefined);
    // Automatically show the result: switch to the relevant tab
    if (status === 'paused') setView('paused');
    if (status === 'active') setView('all');
  }

  function handleGoalAdded(goal: ConstellationGoal) {
    setGoals(gs => {
      const exists = gs.find(g => g.id === goal.id);
      if (exists) return gs;
      // Replace tmp entry — preserve any status the user set while waiting for server
      const tmpIdx = gs.findIndex(g => g.id?.startsWith('tmp-') && g.title === goal.title && g.sphere === goal.sphere);
      if (tmpIdx >= 0) {
        const next = [...gs];
        next[tmpIdx] = { ...goal, status: gs[tmpIdx].status ?? goal.status };
        return next;
      }
      return [...gs, goal];
    });
  }

  function handleDelete(goalId: string) {
    setGoals(gs => gs.filter(g => g.id !== goalId));
    setSelectedId(undefined);
  }

  function handleDecomposeFromPanel(goal: ConstellationGoal) {
    setDecomposeGoal(goal);
    setIdeasOpen(false);
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedId(undefined); setIdeasOpen(false); setSpheresOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Filter goals by sphere and view
  const shown = goals.filter(g => {
    if (filter && g.sphere !== filter) return false;
    if (view === 'paused')   return g.status === 'paused';
    if (view === 'closed')   return g.progress != null && g.progress >= 1;
    if (view === 'upcoming') return g.status !== 'paused' && !g.overdue && (g.progress ?? 0) < 1;
    return g.status !== 'paused'; // 'all' = active only
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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        padding: '14px 32px', flexShrink: 0,
      }}>
        {/* Left: title + tabs inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 20,
            letterSpacing: '-0.025em', color: 'hsl(var(--text-strong))',
            margin: 0, flexShrink: 0,
          }}>
            Мій простір
          </h1>
          <div style={{ width: 1, height: 18, background: 'hsl(var(--border-subtle))', flexShrink: 0 }} />
          <ViewTabs view={view} onView={setView} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Legend spheres={spheres} filter={filter} onFilter={setFilter} />

          {/* Spheres settings */}
          <button
            onClick={() => { setSpheresOpen(o => !o); setIdeasOpen(false); setSelectedId(undefined); }}
            data-no-brighten
            title="Редагувати сфери"
            style={{
              width: 30, height: 30, borderRadius: 999, border: `1px solid ${spheresOpen ? 'hsl(var(--sphere-violet))' : 'hsl(var(--border-subtle))'}`,
              background: spheresOpen ? 'hsl(var(--sphere-violet-soft))' : 'hsl(var(--surface-card))',
              color: spheresOpen ? 'hsl(var(--sphere-violet))' : 'hsl(var(--text-muted))',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .22s ease', flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M11.3 5.7l.7-1.2-1.4-1.4-1.2.7A4 4 0 008 3.3L7.7 2h-2L5.3 3.3A4 4 0 004 4.2l-1.2-.7L1.4 4.9l.7 1.2A4 4 0 002 7c0 .32.04.63.1.9l-.7 1.2 1.4 1.4 1.2-.7c.37.27.77.49 1.2.63L5.7 12h2l.3-1.3c.43-.14.83-.36 1.2-.63l1.2.7 1.4-1.4-.7-1.2c.07-.27.1-.58.1-.9 0-.32-.03-.63-.1-.9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Add goal button */}
          <button
            onClick={() => { setIdeasOpen(o => !o); setSelectedId(undefined); }}
            data-no-brighten
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 'var(--radius-pill)',
              border: `1.5px solid ${ideasOpen ? 'hsl(var(--sphere-violet))' : 'hsl(var(--border-subtle))'}`,
              background: ideasOpen ? 'hsl(var(--sphere-violet-soft))' : 'hsl(var(--surface-card))',
              color: ideasOpen ? 'hsl(var(--sphere-violet))' : 'hsl(var(--text-body))',
              cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13,
              transition: 'all .25s cubic-bezier(0.34,1.1,0.64,1)',
              transform: ideasOpen ? 'scale(1.04)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800 }}>+</span>
            Додати ціль
          </button>

          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label="Тема" style={{
              width: 34, height: 34, flexShrink: 0, borderRadius: 999, cursor: 'pointer',
              border: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--surface-card))',
              color: 'hsl(var(--text-body))', fontSize: 16,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {theme === 'dark' ? '☀︎' : '☾'}
          </button>
        </div>
      </header>

      {/* Graph */}
      <div ref={containerRef} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <ObsidianGraph
          key={view + ':' + (filter ?? 'all')}
          goals={shown}
          spheres={spheres}
          selectedId={selectedId}
          onSelect={g => setSelectedId(g?.id ?? undefined)}
          style={{ width: '100%', height: '100%' }}
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
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        )}

        {/* Spheres scrim */}
        {spheresOpen && (
          <div onClick={() => setSpheresOpen(false)} style={{
            position: 'absolute', inset: 0,
            background: 'hsl(28 16% 10% / .10)',
            backdropFilter: 'blur(1px)',
            zIndex: 21,
          }} />
        )}

        {/* Spheres panel */}
        {spheresOpen && (
          <SpheresModal
            spheres={spheres}
            onClose={() => setSpheresOpen(false)}
          />
        )}

        {/* Ideas scrim */}
        {ideasOpen && (
          <div onClick={() => setIdeasOpen(false)} style={{
            position: 'absolute', inset: 0,
            background: 'hsl(28 16% 10% / .10)',
            backdropFilter: 'blur(1px)',
            zIndex: 21,
          }} />
        )}

        {/* Add goal panel */}
        {ideasOpen && (
          <IdeasPanel
            spheres={spheres}
            onClose={() => setIdeasOpen(false)}
            onGoalAdded={handleGoalAdded}
            onDecompose={handleDecomposeFromPanel}
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
