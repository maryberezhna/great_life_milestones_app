'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setGoalDependency } from '@/app/actions/goals';

interface Goal { id: string; title: string; }

interface Props {
  goalId: string;
  dependsOnId: string | null;
  allGoals: Goal[];
  accent: string;
  soft: string;
}

export function DependsOnPicker({ goalId, dependsOnId, allGoals, accent, soft }: Props) {
  const [open, setOpen] = useState(false);
  const [, startT] = useTransition();
  const router = useRouter();

  const current = allGoals.find(g => g.id === dependsOnId);
  const choices = allGoals.filter(g => g.id !== goalId);

  function pick(id: string | null) {
    startT(async () => {
      await setGoalDependency(goalId, id);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 'var(--radius-md)',
          border: `1.5px solid ${dependsOnId ? accent : 'hsl(var(--border-subtle))'}`,
          background: dependsOnId ? soft : 'transparent',
          color: dependsOnId ? accent : 'hsl(var(--text-muted))',
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 15 }}>⛓</span>
        {current ? `після: ${current.title}` : 'Залежить від…'}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: 'hsl(var(--surface-card))',
            border: '1px solid hsl(var(--border-subtle))',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 32px hsl(0 0% 0% / .12)',
            zIndex: 50, minWidth: 280, maxWidth: 380,
            maxHeight: 320, overflowY: 'auto',
            padding: '6px 0',
          }}>
            {dependsOnId && (
              <button onClick={() => pick(null)} style={{
                width: '100%', textAlign: 'left', padding: '9px 14px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 13,
                color: 'hsl(var(--text-muted))',
                borderBottom: '1px solid hsl(var(--border-subtle))',
              }}>
                ✕ Прибрати залежність
              </button>
            )}
            {choices.length === 0 && (
              <div style={{ padding: '12px 14px', color: 'hsl(var(--text-faint))', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
                Немає інших цілей
              </div>
            )}
            {choices.map(g => (
              <button key={g.id} onClick={() => pick(g.id)} style={{
                width: '100%', textAlign: 'left', padding: '9px 14px',
                background: g.id === dependsOnId ? soft : 'transparent',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 13,
                color: g.id === dependsOnId ? accent : 'hsl(var(--text-strong))',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {g.id === dependsOnId && <span style={{ color: accent }}>✓</span>}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.title}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
