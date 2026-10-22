'use client';

import { useState, useTransition, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { renameGoal } from '@/app/actions/goals';

// A title you can rename in place: ✎ → edit, Enter saves, Esc cancels, empty is not allowed
export function EditableTitle({ title, onSave, as: Tag = 'h2', className, style, label = 'Перейменувати' }: {
  title: string;
  onSave: (next: string) => Promise<void>;
  as?: 'h1' | 'h2';
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}) {
  const [shown, setShown] = useState(title);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [error, setError] = useState('');
  const [isPending, startT] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  // grow with the text, like the title it replaces
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px';
  }, [draft, editing]);

  function open() { setDraft(shown); setError(''); setEditing(true); }
  function cancel() { setEditing(false); setError(''); }

  function save() {
    const t = draft.trim();
    if (!t) { setError('Назва не може бути порожньою'); return; }
    if (t === shown) { setEditing(false); return; }
    const prev = shown;
    setShown(t);
    setEditing(false);
    startT(async () => {
      try { await onSave(t); }
      catch { setShown(prev); setError('Не вдалося зберегти назву. Спробуй ще раз.'); }
    });
  }

  if (editing) {
    return (
      <div>
        <textarea
          ref={ref}
          autoFocus
          rows={1}
          value={draft}
          aria-label="Нова назва"
          onChange={e => { setDraft(e.target.value); if (error) setError(''); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
          }}
          onFocus={e => e.currentTarget.select()}
          className={className}
          style={{
            ...style, display: 'block', width: '100%', boxSizing: 'border-box', resize: 'none', overflow: 'hidden',
            margin: 0, padding: '4px 8px', marginLeft: -9,
            border: '1.5px solid hsl(var(--sphere-violet))', borderRadius: 'var(--radius-md)',
            background: 'hsl(var(--surface-base))', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={save} disabled={!draft.trim()} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: 'none',
            background: draft.trim() ? 'hsl(var(--sphere-violet))' : 'hsl(var(--surface-sunken))',
            color: draft.trim() ? '#fff' : 'hsl(var(--text-faint))',
            cursor: draft.trim() ? 'pointer' : 'default',
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13,
          }}>Зберегти</button>
          <button type="button" onClick={cancel} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid hsl(var(--border-subtle))',
            background: 'transparent', color: 'hsl(var(--text-muted))', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13,
          }}>Скасувати</button>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: error ? '#dc2626' : 'hsl(var(--text-faint))' }}>
            {error ? `⚠ ${error}` : 'Enter — зберегти · Esc — скасувати'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Tag className={className} style={{ ...style, margin: 0 }}>
        {shown}
        <button type="button" onClick={open} aria-label={label} title={label} disabled={isPending} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle',
          width: 28, height: 28, marginLeft: 8, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'hsl(var(--surface-sunken))', color: 'hsl(var(--text-muted))',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 400, lineHeight: 1, letterSpacing: 0,
          position: 'relative', top: -2,
        }}>✎</button>
      </Tag>
      {error && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: '#dc2626', marginTop: 6 }}>⚠ {error}</div>
      )}
    </div>
  );
}

// Goal title: renames in the database, then lets the page (and the A4 version) pick it up
export function GoalTitle({ goalId, title, onRenamed, ...rest }: {
  goalId: string;
  title: string;
  onRenamed?: (title: string) => void;
  as?: 'h1' | 'h2';
  className?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  return (
    <EditableTitle
      {...rest}
      title={title}
      label="Перейменувати ціль"
      onSave={async t => {
        await renameGoal(goalId, t);
        onRenamed?.(t);
        router.refresh();
      }}
    />
  );
}
