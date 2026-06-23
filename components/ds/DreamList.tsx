'use client';

import React, { useState, useRef, useTransition } from 'react';
import type { Dream } from '@/app/actions/dreams';
import type { SphereOption } from '@/app/actions/goals';
import { toggleDream, addDream } from '@/app/actions/dreams';
import { PromoteDreamModal } from './PromoteDreamModal';

const COLORS = ['violet','amber','sage','rose','blue','violet','amber','sage','rose','blue','violet'];
const UID = 'dreams';

export function DreamList({ initial, spheres }: { initial: Dream[]; spheres: SphereOption[] }) {
  const [dreams, setDreams]         = useState<Dream[]>(initial);
  const [promoting, setPromoting]   = useState<Dream | null>(null);
  const [addingText, setAddingText] = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [flash, setFlash]           = useState<string | null>(null);
  const [, startTransition]         = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const pending = dreams.filter(d => !d.done);
  const done    = dreams.filter(d =>  d.done);
  const ordered = [...pending, ...done];
  const pct     = ordered.length ? Math.round((done.length / ordered.length) * 100) : 0;

  function handleToggleDone(e: React.MouseEvent, d: Dream) {
    e.stopPropagation();
    const next = dreams.map(x => x.id === d.id ? { ...x, done: !x.done } : x);
    setDreams(next);
    if (!d.done) { setFlash(d.id); setTimeout(() => setFlash(null), 600); }
    startTransition(async () => {
      try { await toggleDream(d.id, !d.done); }
      catch { setDreams(dreams); }
    });
  }

  function handlePromoted(dreamId: string) {
    // Mark the dream as done after it's been promoted to a goal
    const next = dreams.map(x => x.id === dreamId ? { ...x, done: true } : x);
    setDreams(next);
    startTransition(async () => {
      try { await toggleDream(dreamId, true); } catch { /* silent */ }
    });
  }

  function handleAdd() {
    if (!addingText.trim()) { setShowAdd(false); return; }
    const optimisticId = `tmp-${Date.now()}`;
    const optimistic: Dream = {
      id: optimisticId, title: addingText.trim(),
      done: false, sort_order: 99, created_at: new Date().toISOString(),
    };
    setDreams(prev => [...prev, optimistic]);
    const text = addingText.trim();
    setAddingText(''); setShowAdd(false);
    startTransition(async () => {
      try {
        const realId = await addDream(text);
        setDreams(prev => prev.map(d => d.id === optimisticId ? { ...d, id: realId } : d));
      } catch {
        setDreams(prev => prev.filter(d => d.id !== optimisticId));
      }
    });
  }

  return (
    <>
      <style>{`
        @keyframes ${UID}-pop { 0%{transform:scale(1)} 35%{transform:scale(1.05)} 100%{transform:scale(1)} }
        @keyframes ${UID}-in  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .${UID}-card { transition: transform .22s ease, box-shadow .22s ease, opacity .3s ease; }
        .${UID}-card:not(:disabled):hover { transform: translateY(-4px); }
        .${UID}-flash { animation: ${UID}-pop .55s cubic-bezier(.34,1.56,.64,1); }
        .${UID}-done-btn { opacity: 0; transition: opacity .15s; }
        .${UID}-card:hover .${UID}-done-btn { opacity: 1; }
      `}</style>

      {/* Progress bar */}
      {ordered.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'hsl(var(--text-muted))' }}>
              {done.length > 0
                ? <><strong style={{ color: 'hsl(var(--text-strong))' }}>{done.length}</strong> з {ordered.length} виконано</>
                : <>{ordered.length} мрій попереду</>}
            </span>
            {done.length > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--text-muted))' }}>{pct}%</span>
            )}
          </div>
          <div style={{ height: 3, background: 'hsl(var(--border-subtle))', borderRadius: 99 }}>
            <div style={{
              height: '100%', borderRadius: 99, width: `${pct}%`,
              background: 'linear-gradient(90deg, hsl(var(--sphere-violet)), hsl(var(--sphere-rose)))',
              transition: 'width .6s cubic-bezier(.34,1.32,.5,1)',
            }} />
          </div>
        </div>
      )}

      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {ordered.map((d, i) => {
          const color  = COLORS[i % COLORS.length];
          const isDone = d.done;
          const isFlash = flash === d.id;

          return (
            <button
              key={d.id}
              onClick={() => !isDone && setPromoting(d)}
              className={`${UID}-card${isFlash ? ` ${UID}-flash` : ''}`}
              title={isDone ? undefined : 'Перетворити на ціль'}
              style={{
                position: 'relative', overflow: 'hidden',
                padding: '18px 16px 22px', minHeight: 120,
                borderRadius: 16, textAlign: 'left',
                background: isDone ? 'hsl(var(--surface-sunken))' : `hsl(var(--sphere-${color}-soft))`,
                border: isDone
                  ? '1px solid hsl(var(--border-subtle))'
                  : `1px solid hsl(var(--sphere-${color}) / .22)`,
                boxShadow: isDone ? 'none' : `0 2px 8px hsl(var(--sphere-${color}) / .10)`,
                cursor: isDone ? 'default' : 'pointer',
                opacity: isDone ? 0.5 : 1,
                animation: `${UID}-in .35s ease both`,
                animationDelay: `${i * 0.04}s`,
              }}
            >
              {/* Watermark number */}
              <span style={{
                position: 'absolute', right: 8, bottom: -10,
                fontFamily: 'var(--font-mono)', fontSize: 80, fontWeight: 900, lineHeight: 1,
                color: isDone ? 'hsl(var(--border-subtle))' : `hsl(var(--sphere-${color}) / .13)`,
                pointerEvents: 'none', userSelect: 'none', transition: 'color .3s',
              }}>{String(i + 1).padStart(2, '0')}</span>

              {/* ✓ toggle button — appears on hover, top-right */}
              <span
                className={`${UID}-done-btn`}
                onClick={e => handleToggleDone(e, d)}
                role="button"
                title={isDone ? 'Відмітити як мрію' : 'Позначити як виконано'}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 24, height: 24, borderRadius: '50%',
                  background: isDone ? 'hsl(var(--sage))' : 'hsl(var(--surface-card) / .85)',
                  border: isDone ? 'none' : '1.5px solid hsl(var(--border-subtle))',
                  color: isDone ? '#fff' : 'hsl(var(--text-faint))',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 2,
                }}
              >✓</span>

              {/* "→ до цілей" hint on hover for active dreams */}
              {!isDone && (
                <span style={{
                  position: 'absolute', bottom: 10, right: 12,
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  color: `hsl(var(--sphere-${color}) / .45)`,
                  zIndex: 1,
                }}>→ до цілей</span>
              )}

              {/* Title */}
              <span style={{
                display: 'block', position: 'relative', zIndex: 1,
                fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 600,
                lineHeight: 1.45, letterSpacing: '-0.01em',
                color: isDone ? 'hsl(var(--text-muted))' : 'hsl(var(--text-strong))',
                textDecoration: isDone ? 'line-through' : 'none',
                textDecorationColor: 'hsl(var(--text-faint))',
                transition: 'color .25s', maxWidth: '85%',
              }}>{d.title}</span>
            </button>
          );
        })}

        {/* Add card */}
        {showAdd ? (
          <div style={{
            padding: '18px 16px', minHeight: 120, borderRadius: 16,
            border: '1.5px dashed hsl(var(--border-subtle))',
            background: 'hsl(var(--surface-card))',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <input ref={inputRef} autoFocus value={addingText}
              onChange={e => setAddingText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowAdd(false); setAddingText(''); } }}
              onBlur={handleAdd}
              placeholder="Нова мрія…"
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 600,
                letterSpacing: '-0.01em', color: 'hsl(var(--text-strong))', width: '100%',
              }}
            />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'hsl(var(--text-faint))', marginTop: 8 }}>
              Enter — зберегти · Esc — скасувати
            </span>
          </div>
        ) : (
          <button
            onClick={() => { setShowAdd(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            style={{
              minHeight: 120, borderRadius: 16,
              border: '1.5px dashed hsl(var(--border-subtle))', background: 'transparent',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              color: 'hsl(var(--text-faint))', transition: 'border-color .2s, color .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--text-muted))'; e.currentTarget.style.color = 'hsl(var(--text-muted))'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))'; e.currentTarget.style.color = 'hsl(var(--text-faint))'; }}
          >
            <span style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '1.5px dashed currentColor',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1,
            }}>+</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500 }}>Додати мрію</span>
          </button>
        )}
      </div>

      {/* Promote modal */}
      {promoting && (
        <PromoteDreamModal
          dream={promoting}
          spheres={spheres}
          onClose={() => setPromoting(null)}
          onPromoted={id => { handlePromoted(id); setPromoting(null); }}
        />
      )}
    </>
  );
}
