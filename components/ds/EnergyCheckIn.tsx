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

function useEnergy() {
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const s = localStorage.getItem(getWeekKey());
    if (s) setSelected(Number(s));
  }, []);
  function pick(v: number) {
    setSelected(v);
    localStorage.setItem(getWeekKey(), String(v));
  }
  return { selected, pick };
}

/** Compact dots for inside the center bubble */
export function EnergyCenterNode({ name = 'mary' }: { name?: string }) {
  const { selected, pick } = useEnergy();
  const emoji = LEVELS.find(l => l.value === selected)?.emoji;

  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{
        fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 22,
        letterSpacing: '0.01em', color: 'hsl(40 50% 97%)', lineHeight: 1.05,
      }}>{name}</span>
      <span style={{ width: 30, height: 1, background: 'hsl(40 40% 92% / .4)' }} />
      {emoji ? (
        <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
      ) : (
        <span style={{
          fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11,
          letterSpacing: '0.18em', color: 'hsl(38 30% 96% / .55)',
          textTransform: 'uppercase',
        }}>енергія?</span>
      )}
      {/* 5 dot selector */}
      <span style={{ display: 'flex', gap: 4, marginTop: 2 }}>
        {LEVELS.map(l => (
          <button
            key={l.value}
            title={l.label}
            onClick={e => { e.stopPropagation(); pick(l.value); }}
            style={{
              width: 10, height: 10, borderRadius: '50%', border: 'none',
              cursor: 'pointer', padding: 0,
              background: selected !== null && l.value <= selected
                ? 'hsl(40 70% 88%)'
                : 'hsl(40 30% 92% / .22)',
              transition: 'background .2s',
            }}
          />
        ))}
      </span>
    </span>
  );
}

/** Inline variant for header/sidebar */
export function EnergyCheckIn() {
  const { selected, pick } = useEnergy();
  const label = LEVELS.find(l => l.value === selected)?.label;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.07em', textTransform: 'uppercase',
        color: 'hsl(var(--text-faint))', whiteSpace: 'nowrap',
      }}>Енергія</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {LEVELS.map(l => (
          <button key={l.value} onClick={() => pick(l.value)} title={l.label} style={{
            width: 28, height: 28, borderRadius: 8,
            border: `1.5px solid ${selected === l.value ? 'hsl(var(--sphere-violet))' : 'hsl(var(--border-subtle))'}`,
            background: selected === l.value ? 'hsl(var(--sphere-violet-soft))' : 'transparent',
            fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .12s',
            opacity: selected !== null && selected !== l.value ? 0.45 : 1,
          }}>{l.emoji}</button>
        ))}
      </div>
      {label && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'hsl(var(--text-muted))' }}>{label}</span>
      )}
    </div>
  );
}
