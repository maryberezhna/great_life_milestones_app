'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGoalFromDream } from '@/app/actions/goals';

interface Props {
  sphereId: string;
  accent: string;
  soft: string;
  isEmpty: boolean;
}

export function AddGoalInline({ sphereId, accent, soft, isEmpty }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [, startT] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function activate() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  }

  function submit() {
    const t = title.trim();
    if (!t) { setOpen(false); return; }
    startT(async () => {
      await createGoalFromDream(t, sphereId);
      setTitle('');
      setOpen(false);
      router.refresh();
    });
  }

  if (isEmpty && !open) {
    return (
      <div
        onClick={activate}
        style={{
          border: '2px dashed hsl(var(--border-subtle))',
          borderRadius: 'var(--radius-lg)',
          padding: 48, textAlign: 'center',
          color: 'hsl(var(--text-muted))',
          fontFamily: 'var(--font-sans)', fontSize: 14,
          cursor: 'pointer',
          transition: 'border-color .2s, color .2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = accent;
          (e.currentTarget as HTMLDivElement).style.color = accent;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(var(--border-subtle))';
          (e.currentTarget as HTMLDivElement).style.color = 'hsl(var(--text-muted))';
        }}
      >
        + Додайте першу ціль для цієї сфери
      </div>
    );
  }

  if (open) {
    return (
      <div style={{
        border: `2px solid ${accent}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex', gap: 10, alignItems: 'center',
        background: soft,
      }}>
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') { setOpen(false); setTitle(''); }
          }}
          placeholder="Назва цілі…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500,
            color: 'hsl(var(--text-strong))',
          }}
        />
        <button
          onClick={submit}
          style={{
            padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none',
            background: accent, color: '#fff',
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          Додати
        </button>
        <button
          onClick={() => { setOpen(false); setTitle(''); }}
          style={{
            padding: '7px 10px', borderRadius: 'var(--radius-md)', border: 'none',
            background: 'transparent', color: 'hsl(var(--text-muted))',
            fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  // Non-empty state — just a button to add more goals (used by header)
  return null;
}

export function AddGoalButton({ sphereId, accent, soft }: Omit<Props, 'isEmpty'>) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [, startT] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function activate() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  }

  function submit() {
    const t = title.trim();
    if (!t) { setOpen(false); return; }
    startT(async () => {
      await createGoalFromDream(t, sphereId);
      setTitle('');
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={activate}
        style={{
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
          color: accent, background: soft,
          padding: '9px 18px', borderRadius: 'var(--radius-md)',
          border: 'none', cursor: 'pointer',
        }}
      >
        + Ціль
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center',
      background: soft, border: `1.5px solid ${accent}`,
      borderRadius: 'var(--radius-md)', padding: '6px 10px',
    }}>
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') { setOpen(false); setTitle(''); }
        }}
        placeholder="Назва цілі…"
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          color: 'hsl(var(--text-strong))', width: 240,
        }}
      />
      <button onClick={submit} style={{
        padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
        background: accent, color: '#fff',
        fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
      }}>Додати</button>
      <button onClick={() => { setOpen(false); setTitle(''); }} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'hsl(var(--text-muted))', fontSize: 14, padding: '4px',
      }}>✕</button>
    </div>
  );
}
