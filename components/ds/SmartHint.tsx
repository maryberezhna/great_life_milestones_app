'use client';

import { useEffect, useState } from 'react';
import { checkSmart, type SmartCheck, type SmartLetter } from '@/app/actions/smart';

const NAMES: Record<SmartLetter, string> = {
  S: 'конкретність', M: 'мірило', A: 'досяжність', R: 'значущість', T: 'строк',
};

// one check per wording — reopening a goal doesn't ask again
const cache = new Map<string, SmartCheck>();

// Small SMART note under a goal title: one line «бракує: …», a tap opens the questions
// (and, when only the date is missing, her title + that date to take with one tap).
// Shows nothing while the goal is SMART enough, while checking, or if the check fails.
export function SmartHint({ title, targetDate = null, onAccept, delay = 900 }: {
  title: string;
  targetDate?: string | null;
  onAccept: (suggestion: string) => void;
  delay?: number;
}) {
  const key = `${title.trim()}|${targetDate ?? ''}`;
  const [result, setResult] = useState<{ key: string; check: SmartCheck } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (title.trim().length < 3 || cache.has(key)) return;
    let alive = true;
    const timer = setTimeout(() => {
      checkSmart(title, targetDate, new Date().toISOString().slice(0, 10))
        .then(check => { cache.set(key, check); if (alive) setResult({ key, check }); })
        .catch(() => { /* no hint is better than a wrong one */ });
    }, delay);
    return () => { alive = false; clearTimeout(timer); };
  }, [key, title, targetDate, delay]);

  const check = cache.get(key) ?? (result?.key === key ? result.check : null);
  if (!check || check.missing.length === 0 || dismissed === key) return null;

  return (
    <div style={{
      marginTop: 8, padding: open ? '8px 12px 10px' : '6px 12px', borderRadius: 'var(--radius-md)',
      background: 'hsl(var(--surface-sunken))', border: '1px solid hsl(var(--border-subtle))',
      fontFamily: 'var(--font-sans)', animation: 'fade-up .22s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: 'hsl(var(--sphere-violet))' }}>SMART</span>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{
          border: 'none', background: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
          fontSize: 12, color: 'hsl(var(--text-muted))',
        }}>
          бракує: {check.missing.map(l => NAMES[l]).join(', ')} <span aria-hidden>{open ? '▴' : '▾'}</span>
        </button>
        <button type="button" onClick={() => setDismissed(key)} aria-label="Сховати підказку" style={{
          marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', padding: 0,
          fontSize: 12, color: 'hsl(var(--text-faint))',
        }}>✕</button>
      </div>
      {open && check.hint && (
        <div style={{ fontSize: 13, lineHeight: 1.45, color: 'hsl(var(--text-body))', marginTop: 4 }}>{check.hint}</div>
      )}
      {open && check.suggestion && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 180px', fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: 'hsl(var(--text-strong))' }}>
            «{check.suggestion}»
          </span>
          <button type="button" onClick={() => onAccept(check.suggestion!)} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
            background: 'hsl(var(--sphere-violet))', color: '#fff',
            fontSize: 12.5, fontWeight: 700, flexShrink: 0,
          }}>Взяти це формулювання</button>
        </div>
      )}
    </div>
  );
}
