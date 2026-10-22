'use client';

import React, { useState, useRef, useTransition } from 'react';
import type { Dream } from '@/app/actions/dreams';
import type { SphereOption } from '@/app/actions/goals';
import { toggleDream, addDream, renameDream } from '@/app/actions/dreams';
import { PromoteDreamModal } from './PromoteDreamModal';

const COLORS = ['violet','amber','sage','rose','blue','violet','amber','sage','rose','blue','violet'];
const UID = 'dreams';

export function DreamList({ initial, spheres }: { initial: Dream[]; spheres: SphereOption[] }) {
  const [dreams, setDreams]         = useState<Dream[]>(initial);
  const [promoting, setPromoting]   = useState<Dream | null>(null);
  const [addingText, setAddingText] = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [flash, setFlash]           = useState<string | null>(null);
  const [picking, setPicking]       = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editText, setEditText]     = useState('');
  const [editError, setEditError]   = useState('');
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

  function startRename(e: React.MouseEvent, d: Dream) {
    e.stopPropagation();
    setEditingId(d.id); setEditText(d.title); setEditError('');
  }

  function saveRename(d: Dream) {
    const t = editText.trim();
    if (!t) { setEditError('Назва не може бути порожньою'); return; }
    setEditingId(null);
    if (t === d.title) return;
    setDreams(prev => prev.map(x => x.id === d.id ? { ...x, title: t } : x));
    startTransition(async () => {
      try { await renameDream(d.id, t); }
      catch { setDreams(prev => prev.map(x => x.id === d.id ? { ...x, title: d.title } : x)); }
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
        @media (hover: none), (max-width: 768px) { .${UID}-done-btn { opacity: .85; } }
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

      {/* Her own words: time to turn dreams into goals */}
      {pending.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '16px 18px', borderRadius: 16,
          background: 'hsl(var(--surface-card))', border: '1px solid hsl(var(--border-subtle))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: 'hsl(var(--text-strong))' }}>
              Ну що, готовий робити з них цілі?
            </span>
            <button onClick={() => setPicking(p => !p)} style={{
              padding: '9px 16px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
              background: picking ? 'hsl(var(--sphere-violet-soft))' : 'hsl(var(--sphere-violet))',
              color: picking ? 'hsl(var(--sphere-violet))' : '#fff',
              fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700, flexShrink: 0,
            }}>{picking ? 'Згорнути' : 'Обрати мрію →'}</button>
          </div>
          {picking && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
              {pending.map(d => (
                <button key={d.id} onClick={() => { setPicking(false); setPromoting(d); }}
                  disabled={d.id.startsWith('tmp-')}
                  style={{
                    padding: '7px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                    border: '1.5px solid hsl(var(--border-subtle))', background: 'transparent',
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-body))',
                    textAlign: 'left',
                  }}>{d.title} <span style={{ color: 'hsl(var(--sphere-violet))' }}>→ ціль</span></button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {ordered.map((d, i) => {
          const color  = COLORS[i % COLORS.length];
          const isDone = d.done;
          const isFlash = flash === d.id;

          // renaming: the card turns into a field
          if (editingId === d.id) {
            return (
              <div key={d.id} style={{
                padding: '14px 14px 12px', minHeight: 120, borderRadius: 16,
                background: 'hsl(var(--surface-card))',
                border: `1.5px solid hsl(var(--sphere-${color}))`,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <textarea autoFocus value={editText} rows={3} aria-label="Нова назва мрії"
                  onChange={e => { setEditText(e.target.value); if (editError) setEditError(''); }}
                  onFocus={e => e.currentTarget.select()}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveRename(d); }
                    if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                  }}
                  style={{
                    border: 'none', outline: 'none', background: 'transparent', resize: 'none', width: '100%',
                    fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 600, lineHeight: 1.45,
                    letterSpacing: '-0.01em', color: 'hsl(var(--text-strong))',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => saveRename(d)} disabled={!editText.trim()} style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-pill)', border: 'none',
                    background: editText.trim() ? `hsl(var(--sphere-${color}))` : 'hsl(var(--surface-sunken))',
                    color: editText.trim() ? '#fff' : 'hsl(var(--text-faint))',
                    cursor: editText.trim() ? 'pointer' : 'default',
                    fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 12.5,
                  }}>Зберегти</button>
                  <button onClick={() => setEditingId(null)} style={{
                    padding: '5px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid hsl(var(--border-subtle))',
                    background: 'transparent', color: 'hsl(var(--text-muted))', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12.5,
                  }}>Скасувати</button>
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: editError ? '#dc2626' : 'hsl(var(--text-faint))' }}>
                  {editError ? `⚠ ${editError}` : 'Enter — зберегти · Esc — скасувати'}
                </span>
              </div>
            );
          }

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

              {/* ✎ rename — next to ✓ */}
              {!d.id.startsWith('tmp-') && (
                <span
                  className={`${UID}-done-btn`}
                  onClick={e => startRename(e, d)}
                  role="button"
                  aria-label="Перейменувати мрію"
                  title="Перейменувати"
                  style={{
                    position: 'absolute', top: 10, right: 40,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'hsl(var(--surface-card) / .85)',
                    border: '1.5px solid hsl(var(--border-subtle))',
                    color: 'hsl(var(--text-muted))',
                    fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 2,
                  }}
                >✎</span>
              )}

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
