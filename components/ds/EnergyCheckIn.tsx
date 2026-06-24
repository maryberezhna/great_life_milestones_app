'use client';

import { useEffect, useState } from 'react';

const LEVELS = [
  { value: 1, emoji: '😴', label: 'Виснажений' },
  { value: 2, emoji: '😕', label: 'Нижче норми' },
  { value: 3, emoji: '😐', label: 'Нормально' },
  { value: 4, emoji: '😊', label: 'Добре' },
  { value: 5, emoji: '🔥', label: 'Максимум' },
];

function getWeekKey() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return `energy_${mon.toISOString().slice(0, 10)}`;
}

export function EnergyCheckIn() {
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(getWeekKey());
    if (stored) { setSelected(Number(stored)); setSaved(true); }
  }, []);

  function pick(v: number) {
    setSelected(v);
    setSaved(true);
    localStorage.setItem(getWeekKey(), String(v));
  }

  const level = LEVELS.find(l => l.value === selected);

  return (
    <div style={{
      background: 'hsl(var(--surface-card))',
      border: '1px solid hsl(var(--border-subtle))',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 18px',
      marginBottom: 24,
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.07em',
        color: 'hsl(var(--text-faint))', marginBottom: 10,
      }}>
        Енергія цього тижня
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {LEVELS.map(l => (
          <button
            key={l.value}
            onClick={() => pick(l.value)}
            title={l.label}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: `1.5px solid ${selected === l.value ? 'hsl(var(--sphere-violet))' : 'hsl(var(--border-subtle))'}`,
              background: selected === l.value ? 'hsl(var(--sphere-violet-soft))' : 'transparent',
              fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .12s',
            }}
          >
            {l.emoji}
          </button>
        ))}
        {saved && level && (
          <span style={{
            marginLeft: 8,
            fontFamily: 'var(--font-sans)', fontSize: 13,
            color: 'hsl(var(--text-muted))',
          }}>
            {level.label}
          </span>
        )}
      </div>
    </div>
  );
}
