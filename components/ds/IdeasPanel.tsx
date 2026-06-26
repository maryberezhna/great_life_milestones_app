'use client';

import { useState, useTransition, useRef } from 'react';
import { createGoalFromDream } from '@/app/actions/goals';
import type { ConstellationGoal, ConstellationSphere } from './GoalConstellation';

interface Props {
  spheres: ConstellationSphere[];
  onClose: () => void;
  onGoalAdded: (goal: ConstellationGoal) => void;
  onDecompose: (goal: ConstellationGoal) => void;
}

export function IdeasPanel({ spheres, onClose, onGoalAdded, onDecompose }: Props) {
  const [title, setTitle] = useState('');
  const [sphereId, setSphereId] = useState<string>('');
  const [noSphereError, setNoSphereError] = useState(false);
  const [recent, setRecent] = useState<ConstellationGoal[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startT] = useTransition();

  function handleAdd() {
    const t = title.trim();
    if (!t) return;
    if (!sphereId) { setNoSphereError(true); return; }
    setNoSphereError(false);

    const sphere = spheres.find(s => s.id === sphereId)!;
    const optimisticGoal: ConstellationGoal = {
      id: `tmp-${Date.now()}`,
      title: t,
      sphere: sphere.key,
      weight: 1,
      status: 'active',
    };

    // Immediately add to board + local list
    onGoalAdded(optimisticGoal);
    setRecent(r => [optimisticGoal, ...r]);
    setTitle('');
    inputRef.current?.focus();

    startT(async () => {
      try {
        const realId = await createGoalFromDream(t, sphereId);
        // patch the optimistic id to the real one
        const realGoal = { ...optimisticGoal, id: realId };
        setRecent(r => r.map(g => g.id === optimisticGoal.id ? realGoal : g));
        onGoalAdded(realGoal); // board will de-dup or replace by id
      } catch {
        // rollback from list; board will still show but that's ok for now
        setRecent(r => r.filter(g => g.id !== optimisticGoal.id));
      }
    });
  }

  return (
    <aside style={{
      position: 'absolute', top: 0, right: 0, height: '100%', width: 400,
      background: 'hsl(var(--surface-card))',
      boxShadow: '-18px 0 48px hsl(28 16% 10% / .18)',
      zIndex: 22, display: 'flex', flexDirection: 'column',
      animation: 'panel-in .38s cubic-bezier(0.22,1,0.36,1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '22px 24px 18px',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--text-faint))', marginBottom: 4 }}>
            Нова ціль
          </div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'hsl(var(--text-strong))', margin: 0 }}>
            Додати ціль
          </h2>
        </div>
        <button onClick={onClose} data-no-brighten style={{
          width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'hsl(var(--surface-sunken))', color: 'hsl(var(--text-muted))',
          fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      {/* Form */}
      <div style={{ padding: '18px 24px 20px', borderBottom: '1px solid hsl(var(--border-subtle) / .6)' }}>
        <input
          ref={inputRef}
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Назва цілі…"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
            border: '1.5px solid hsl(var(--border-subtle))', outline: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 500,
            color: 'hsl(var(--text-strong))', background: 'hsl(var(--surface-base))',
            marginBottom: 12,
            transition: 'border-color .2s ease',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--sphere-violet))'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))'; }}
        />

        {/* Sphere selector */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: noSphereError ? '#dc2626' : 'hsl(var(--text-faint))', marginBottom: 8, fontWeight: 600 }}>
            {noSphereError ? '⚠ Оберіть сферу' : 'Сфера'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {spheres.map(s => {
              const on = sphereId === s.id;
              return (
                <button key={s.id} data-no-brighten
                  onClick={() => { setSphereId(on ? '' : s.id); setNoSphereError(false); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 11px', borderRadius: 'var(--radius-pill)',
                    border: `1.5px solid ${on ? `hsl(var(--sphere-${s.key}))` : noSphereError ? 'hsl(0 60% 80%)' : 'hsl(var(--border-subtle))'}`,
                    background: on ? `hsl(var(--sphere-${s.key}-soft))` : 'transparent',
                    color: on ? `hsl(var(--sphere-${s.key}))` : 'hsl(var(--text-muted))',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
                    transition: 'all .22s cubic-bezier(0.34,1.1,0.64,1)',
                    transform: on ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <span>{s.icon as string}</span>{s.name}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={!title.trim()}
          style={{
            width: '100%', padding: '11px', borderRadius: 'var(--radius-md)',
            border: 'none', cursor: title.trim() ? 'pointer' : 'default',
            background: title.trim()
              ? (sphereId ? `hsl(var(--sphere-${spheres.find(s => s.id === sphereId)?.key ?? 'violet'}))` : 'hsl(var(--sphere-violet))')
              : 'hsl(var(--surface-sunken))',
            color: title.trim() ? '#fff' : 'hsl(var(--text-faint))',
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14,
            marginTop: 14,
            transition: 'background .3s ease, color .2s ease',
          }}
        >
          + Додати ціль на борд
        </button>
      </div>

      {/* Recently added */}
      {recent.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-faint))', marginBottom: 10, padding: '0 2px' }}>
            Додано щойно
          </div>
          {recent.map(g => {
            const sphere = spheres.find(s => s.key === g.sphere);
            const col = `hsl(var(--sphere-${g.sphere}))`;
            const soft = `hsl(var(--sphere-${g.sphere}-soft))`;
            return (
              <div key={g.id} style={{
                padding: '11px 14px', borderRadius: 'var(--radius-md)',
                background: 'hsl(var(--surface-base))',
                border: '1px solid hsl(var(--border-subtle))',
                marginBottom: 8,
                animation: 'fade-up .24s cubic-bezier(0.34,1.1,0.64,1)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{sphere?.icon as string}</span>
                <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: 'hsl(var(--text-strong))', lineHeight: 1.35 }}>
                  {g.title}
                </span>
                <button
                  onClick={() => { onDecompose(g); }}
                  style={{
                    flexShrink: 0, padding: '5px 10px', borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${col}`, background: soft,
                    color: col, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 11.5,
                    whiteSpace: 'nowrap',
                    transition: 'opacity .2s ease',
                  }}
                >
                  ✦ Кроки
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
