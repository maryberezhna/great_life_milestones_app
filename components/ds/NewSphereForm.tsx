'use client';

import { useState, useTransition } from 'react';
import { createSphere } from '@/app/actions/spheres';
import { SPHERE_PALETTE } from '@/lib/sphere-palette';

export interface CreatedSphere {
  id: string;
  name: string;
  icon: string;
  color: string;
  key: string;
}

export const sphereKeyOf = (hex: string) => SPHERE_PALETTE.find(c => c.hex === hex)?.key ?? 'violet';

// a new sphere starts with a colour no other sphere has yet, so it stands apart in the sky
export function freeSphereColor(taken: string[]): string {
  return (SPHERE_PALETTE.find(c => !taken.includes(c.hex)) ?? SPHERE_PALETTE[0]).hex;
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {SPHERE_PALETTE.map(c => {
        const on = value === c.hex;
        return (
          <button key={c.key} type="button" data-no-brighten title={c.label} aria-label={c.label}
            onClick={() => onChange(c.hex)}
            style={{
              width: 26, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: `hsl(var(--sphere-${c.key}))`,
              boxShadow: on ? `0 0 0 2px hsl(var(--surface-base)), 0 0 0 4px hsl(var(--sphere-${c.key}))` : 'none',
              transform: on ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform .18s ease, box-shadow .18s ease',
            }}
          />
        );
      })}
    </div>
  );
}

// One form for a new sphere — used in «Сфери» and right inside «Додати ціль»
export function NewSphereForm({ initialColor = '#8B5CF6', onCreated, onCancel }: {
  initialColor?: string;
  onCreated: (sphere: CreatedSphere) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState(initialColor);
  const [error, setError] = useState('');
  const [isPending, startT] = useTransition();
  const key = sphereKeyOf(color);
  const ready = !!name.trim() && !isPending;

  function handleAdd() {
    const n = name.trim();
    if (!n || isPending) return;
    setError('');
    startT(async () => {
      try {
        const ic = icon.trim() || '⭐';
        const id = await createSphere(n, ic, color);
        onCreated({ id, name: n, icon: ic, color, key });
      } catch {
        setError('Не вдалося створити сферу. Спробуй ще раз.');
      }
    });
  }

  return (
    <div style={{
      padding: '14px', borderRadius: 'var(--radius-md)',
      border: `1.5px solid hsl(var(--sphere-${key}))`,
      background: `hsl(var(--sphere-${key}-soft))`,
      animation: 'fade-up .22s ease',
    }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: `hsl(var(--sphere-${key}))`, marginBottom: 10 }}>
        Нова сфера
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={icon}
          onChange={e => setIcon(e.target.value)}
          placeholder="⭐"
          maxLength={2}
          aria-label="Значок сфери"
          style={{
            width: 48, padding: '8px', borderRadius: 'var(--radius-md)', textAlign: 'center',
            border: '1.5px solid hsl(var(--border-subtle))', outline: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 18, background: 'hsl(var(--surface-base))',
            color: 'hsl(var(--text-strong))', boxSizing: 'border-box',
          }}
        />
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="Назва сфери…"
          style={{
            flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 'var(--radius-md)',
            border: '1.5px solid hsl(var(--border-subtle))', outline: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
            background: 'hsl(var(--surface-base))', color: 'hsl(var(--text-strong))', boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      {error && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: '#dc2626', marginBottom: 10 }}>⚠ {error}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel} data-no-brighten style={{
          flex: 1, padding: '8px', borderRadius: 'var(--radius-md)',
          border: '1px solid hsl(var(--border-subtle))', background: 'transparent',
          color: 'hsl(var(--text-muted))', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13,
        }}>Скасувати</button>
        <button type="button" onClick={handleAdd} disabled={!ready} style={{
          flex: 2, padding: '8px', borderRadius: 'var(--radius-md)',
          border: 'none',
          background: ready ? `hsl(var(--sphere-${key}))` : 'hsl(var(--surface-sunken))',
          color: ready ? '#fff' : 'hsl(var(--text-faint))',
          cursor: ready ? 'pointer' : 'default',
          fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13,
        }}>{isPending ? 'Створюю…' : 'Додати сферу'}</button>
      </div>
    </div>
  );
}
