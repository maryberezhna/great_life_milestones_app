'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCalendarSettings, addToGoogleCalendar, type CalendarProvider } from '@/app/actions/calendar';
import { generateIcs, downloadIcs, type IcsEvent } from '@/lib/ics';

// the connected calendar is asked once per page load and shared by every button
let settingsPromise: Promise<CalendarProvider | null> | null = null;
function loadProvider() {
  settingsPromise ??= getCalendarSettings().then(s => s.provider).catch(() => null);
  return settingsPromise;
}
// after connecting or switching in «Календар»
export function forgetCalendarProvider() { settingsPromise = null; }

type State = 'idle' | 'pending' | 'done' | 'error';

// One button: steps go to the calendar connected in «Календар».
// Not connected yet → «Календар», to connect first.
export function AddToCalendarButton({ events, label = 'Додати в календар', compact = false, inline = false, color }: {
  events: IcsEvent[];
  label?: string;
  compact?: boolean;   // a small 📅 next to a single step
  inline?: boolean;    // sized to its text (page headers), not full width
  color?: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<CalendarProvider | null | undefined>(undefined);
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    let alive = true;
    loadProvider().then(p => { if (alive) setProvider(p); });
    return () => { alive = false; };
  }, []);

  async function add() {
    if (state === 'pending' || events.length === 0) return;
    const p = provider === undefined ? await loadProvider() : provider;
    if (!p) { router.push('/calendar?connect=1'); return; }
    if (p === 'apple') {
      // iPhone and Mac open the file straight in Calendar («Додати все»)
      downloadIcs(generateIcs(events), 'sphere-steps.ics');
      setState('done');
      return;
    }
    setState('pending');
    try {
      await addToGoogleCalendar(events, Intl.DateTimeFormat().resolvedOptions().timeZone);
      setState('done');
    } catch {
      setState('error');
    }
  }

  const col = color ?? 'hsl(var(--sphere-violet))';
  const text =
    state === 'pending' ? 'Додаю…'
    : state === 'done' ? 'Додано ✓'
    : state === 'error' ? 'Не вийшло — спробуй ще'
    : label;
  const title = provider === null ? 'Спершу підключи календар у «Календар»' : undefined;

  if (compact) {
    return (
      <button type="button" onClick={e => { e.stopPropagation(); add(); }} title={title ?? (state === 'done' ? 'Додано' : label)}
        aria-label={state === 'done' ? 'Додано в календар' : label} disabled={state === 'pending'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', borderRadius: 999,
          border: `1px solid ${state === 'done' ? col : 'hsl(var(--border-subtle))'}`,
          background: 'transparent', cursor: 'pointer', color: state === 'done' ? col : 'hsl(var(--text-muted))',
          fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600,
        }}>
        📅{state === 'done' ? ' ✓' : state === 'pending' ? ' …' : state === 'error' ? ' !' : ''}
      </button>
    );
  }

  return (
    <button type="button" onClick={add} title={title} disabled={state === 'pending'}
      style={{
        width: inline ? 'auto' : '100%', padding: inline ? '8px 16px' : '12px 20px',
        borderRadius: inline ? 'var(--radius-pill)' : 'var(--radius-md)', flexShrink: 0,
        border: `1.5px solid ${col}`, background: state === 'done' ? col : 'transparent',
        color: state === 'done' ? '#fff' : state === 'error' ? 'hsl(var(--overdue))' : col,
        cursor: state === 'pending' ? 'default' : 'pointer',
        fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: inline ? 13.5 : 14.5,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background .2s ease, color .2s ease',
      }}>
      {state === 'done' ? '' : '📅 '}{text}
    </button>
  );
}
