'use client';

import { useState, useEffect, useRef } from 'react';
import { generateIcs, downloadIcs, type IcsEvent } from '@/lib/ics';

interface Props {
  events: IcsEvent[];
  label?: string;
}

export function CalendarSyncMenu({ events, label = 'Синхронізувати' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleApple() {
    downloadIcs(generateIcs(events), 'planning-tasks.ics');
    setOpen(false);
  }

  function handleGoogle() {
    // Bulk import: download .ics — user imports via calendar.google.com/calendar/r/settings/export or
    // if there's only 1 event open direct URL
    if (events.length === 1) {
      const e = events[0];
      const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
        + '&text='    + encodeURIComponent(e.title)
        + '&dates='   + e.date.replace(/-/g, '') + 'T090000/' + e.date.replace(/-/g, '') + 'T100000'
        + '&details=' + encodeURIComponent(e.description ?? '');
      window.open(url, '_blank', 'noopener');
    } else {
      downloadIcs(generateIcs(events), 'planning-tasks.ics');
    }
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 14px', borderRadius: 'var(--radius-pill)',
          border: '1.5px solid hsl(var(--border-subtle))',
          background: open ? 'hsl(var(--surface-sunken))' : 'transparent',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
          color: 'hsl(var(--text-muted))',
          transition: 'background .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--surface-sunken))')}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 14 }}>📅</span>
        {label}
        <span style={{ fontSize: 10, opacity: .6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'hsl(var(--surface-card))',
          border: '1px solid hsl(var(--border-subtle))',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          padding: '6px', zIndex: 50,
          minWidth: 200,
          animation: 'cal-menu-in .15s ease',
        }}>
          <style>{`@keyframes cal-menu-in { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }`}</style>

          <button onClick={handleGoogle} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 'var(--radius-md)',
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500,
            color: 'hsl(var(--text-body))', textAlign: 'left',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--surface-sunken))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 16 }}>🗓</span>
            <div>
              <div style={{ fontWeight: 600 }}>Google Calendar</div>
              <div style={{ fontSize: 11.5, color: 'hsl(var(--text-faint))', marginTop: 1 }}>
                {events.length === 1 ? 'Відкрити в Google Calendar' : 'Завантажити .ics для імпорту'}
              </div>
            </div>
          </button>

          <button onClick={handleApple} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 'var(--radius-md)',
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500,
            color: 'hsl(var(--text-body))', textAlign: 'left',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--surface-sunken))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 16 }}>🍎</span>
            <div>
              <div style={{ fontWeight: 600 }}>Apple Calendar</div>
              <div style={{ fontSize: 11.5, color: 'hsl(var(--text-faint))', marginTop: 1 }}>
                Завантажити .ics файл
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
