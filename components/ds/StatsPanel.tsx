'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ConstellationGoal, ConstellationSphere } from './GoalConstellation';
import { energy, plural, weeksAgo } from './LivingSky';

// «Я» → my rhythm: process over results — weeks in motion, not percentages.

interface Props {
  goals: ConstellationGoal[];
  spheres: ConstellationSphere[];
  onClose: () => void;
}

const label: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
  textTransform: 'uppercase', color: 'hsl(var(--text-faint))', margin: '0 0 10px',
};
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--text-muted))' };

function Big({ value, caption, accent }: { value: string | number; caption: string; accent?: string }) {
  return (
    <div style={{ padding: '14px 14px 12px', borderRadius: 'var(--radius-md)', background: 'hsl(var(--surface-sunken))' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', color: accent ?? 'hsl(var(--text-strong))', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'hsl(var(--text-muted))', lineHeight: 1.35 }}>{caption}</div>
    </div>
  );
}

export function StatsPanel({ goals, spheres, onClose }: Props) {
  const [now] = useState(() => Date.now());
  const dates = goals.flatMap(g => g.doneDates ?? []);
  const perWeek = Array.from({ length: 12 }, (_, i) => dates.filter(d => weeksAgo(d, now) === 11 - i).length);
  const thisWeek = perWeek[11];
  let streak = 0;
  while (streak < 12 && perWeek[11 - streak] > 0) streak++;
  const maxWeek = Math.max(...perWeek, 1);

  const sphereRows = spheres
    .map(s => {
      const gs = goals.filter(g => g.sphereId ? g.sphereId === s.id : g.sphere === s.key);
      const ds = gs.flatMap(g => g.doneDates ?? []);
      const last = ds.length ? Math.min(...ds.map(d => weeksAgo(d, now))) : null;
      return { s, goals: gs.length, steps: ds.length, e: energy(ds, now), last };
    })
    .filter(r => r.goals > 0)
    .sort((a, b) => b.e - a.e || b.steps - a.steps);
  const lit = sphereRows.filter(r => r.last === 0).length;

  const active = goals.filter(g => g.status === 'active');
  const counts: [string, number][] = [
    ['активних', active.length],
    ['завершених', goals.filter(g => g.status === 'done').length],
    ['на паузі', goals.filter(g => g.status === 'paused').length],
    ['чекають першого кроку', active.filter(g => (g.total ?? 0) > 0 && !(g.doneDates ?? []).length).length],
    ['ще без кроків', active.filter(g => !g.total).length],
  ];

  return (
    <aside className="sheet-panel" style={{
      position: 'absolute', top: 0, right: 0, height: '100%', width: 'min(432px, 100%)',
      background: 'hsl(var(--surface-card))', boxShadow: '-18px 0 48px hsl(28 16% 10% / .16)',
      zIndex: 19, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      animation: 'panel-in .44s cubic-bezier(0.22, 1, 0.36, 1)',
    }}>
      <div style={{ padding: '22px 26px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 10px', borderRadius: 'var(--radius-pill)',
          background: 'hsl(var(--primary-soft))', color: 'hsl(var(--primary))', fontSize: 13.5, fontWeight: 700,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'hsl(var(--primary))' }} />Я
        </span>
        <button onClick={onClose} aria-label="Закрити" style={{
          width: 36, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'hsl(var(--surface-sunken))', color: 'hsl(var(--text-muted))',
          fontSize: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      <div style={{ padding: '18px 26px 28px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <h2 className="panel-title" style={{ font: 'var(--font-goal-title)', color: 'hsl(var(--text-strong))', letterSpacing: '-0.02em', lineHeight: 1.12, margin: 0 }}>
          Мій ритм
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Big value={thisWeek} caption={`${plural(thisWeek, 'крок', 'кроки', 'кроків')} цього тижня`} accent={thisWeek ? 'hsl(var(--success))' : undefined} />
          <Big value={streak} caption={`${plural(streak, 'тиждень', 'тижні', 'тижнів')} поспіль у русі`} />
          <Big value={`${lit} з ${sphereRows.length}`} caption="сфер світиться цього тижня" />
          <Big value={dates.length} caption={`${plural(dates.length, 'крок', 'кроки', 'кроків')} за весь час`} />
        </div>

        {/* 12-week rhythm */}
        <div>
          <p style={label}>Ритм · 12 тижнів</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 84 }}>
            {perWeek.map((n, i) => (
              <div key={i} title={`${n} ${plural(n, 'крок', 'кроки', 'кроків')}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                {n > 0 && <span style={{ ...mono, fontSize: 10.5 }}>{n}</span>}
                <div style={{
                  width: '100%', borderRadius: 5,
                  height: n ? `${Math.max(10, (n / maxWeek) * 60)}px` : 4,
                  background: n ? (i === 11 ? 'hsl(var(--success))' : 'hsl(var(--primary) / .55)') : 'hsl(var(--border-subtle))',
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, ...mono, fontSize: 11 }}>
            <span>11 тижнів тому</span><span>цей тиждень</span>
          </div>
        </div>

        {/* spheres */}
        <div>
          <p style={label}>Сфери</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sphereRows.map(r => (
              <div key={r.s.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'hsl(var(--text-strong))' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: r.s.color, boxShadow: r.e ? `0 0 8px ${r.s.color}` : 'none', opacity: .35 + r.e * .65 }} />
                  {r.s.name}
                  <span style={{ marginLeft: 'auto', ...mono, fontSize: 11.5 }}>
                    {r.last === 0 ? 'світиться' : r.last !== null ? `тиша ${r.last} ${plural(r.last, 'тиждень', 'тижні', 'тижнів')}` : 'ще без кроків'}
                  </span>
                </div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'hsl(var(--surface-sunken))', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(r.e * 100, r.steps ? 4 : 0)}%`, height: '100%', borderRadius: 99, background: r.s.color }} />
                  </div>
                  <span style={{ ...mono, fontSize: 11, minWidth: 92, textAlign: 'right' }}>
                    {r.steps} {plural(r.steps, 'крок', 'кроки', 'кроків')} · {r.goals} {plural(r.goals, 'ціль', 'цілі', 'цілей')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* goals */}
        <div>
          <p style={label}>Цілі</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {counts.map(([t, n]) => (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(var(--border-subtle))', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--text-body))' }}>
                <span>{t}</span><span style={{ fontWeight: 700, color: 'hsl(var(--text-strong))' }}>{n}</span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/report" style={{
          display: 'block', textAlign: 'center', padding: '12px 20px', borderRadius: 'var(--radius-md)',
          border: '1.5px solid hsl(var(--border-subtle))', textDecoration: 'none',
          fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'hsl(var(--text-body))',
        }}>Тижневий звіт →</Link>
      </div>
    </aside>
  );
}
