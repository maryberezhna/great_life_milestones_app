'use client';

import React from 'react';

export interface ConstellationGoal {
  id?: string;
  title: string;
  sphere: string;
  weight?: number;
  note?: string;
  overdue?: boolean;
  progress?: number;
  done?: number;
  total?: number;
}

export interface ConstellationSphere {
  key: string;
  name: string;
  icon?: React.ReactNode;
}

interface GoalConstellationProps {
  goals: ConstellationGoal[];
  spheres: ConstellationSphere[];
  width?: number;
  height?: number;
  selectedId?: string;
  onSelect?: (goal: ConstellationGoal | null) => void;
  centerNode?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function GoalConstellation({
  goals = [],
  spheres: _spheres = [],
  width = 1280,
  height = 760,
  selectedId,
  onSelect,
  centerNode,
  style = {},
  className = '',
}: GoalConstellationProps) {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const cx = width / 2;
  const cy = height / 2 + 6;
  const rxBase = Math.min(width * 0.255, 340);
  const ryBase = Math.min(height * 0.34, 268);
  const bands = [0.74, 1.08];

  const weights = goals.map((g) => g.weight ?? 1);
  const minW = Math.min(...weights, 1);
  const maxW = Math.max(...weights, 1);
  const rOf = (w?: number) => {
    if (maxW === minW) return 30;
    const t = ((w ?? 1) - minW) / (maxW - minW);
    return 20 + t * 24;
  };

  const n = Math.max(goals.length, 1);
  const start = -Math.PI / 2 - Math.PI / n;
  const nodes = goals.map((g, i) => {
    const a = start + (i * 2 * Math.PI) / n;
    const band = bands[i % bands.length];
    return {
      ...g,
      a,
      x: cx + rxBase * band * Math.cos(a),
      y: cy + ryBase * band * Math.sin(a),
      r: rOf(g.weight),
      i,
    };
  });

  const rings = [0.5, 0.8, 1.12];
  const uid = React.useId().replace(/:/g, '');
  const ease = 'cubic-bezier(.34,1.32,.5,1)';

  if (!mounted) return <div style={{ position: 'relative', width, height }} />;

  return (
    <div className={className} style={{ position: 'relative', width, height, ...style }}>
      <style>{`
        @keyframes gc-pop-${uid} { from { transform: scale(.5); } to { transform: scale(1); } }
        @keyframes gc-core-${uid} {
          0%,100% { box-shadow: 0 20px 48px rgba(0,0,0,.18), 0 0 0 14px hsl(var(--neutral-900, 12 10% 9%)/.045), 0 0 60px hsl(var(--neutral-900, 12 10% 9%)/.12); }
          50% { box-shadow: 0 20px 48px rgba(0,0,0,.18), 0 0 0 18px hsl(var(--neutral-900, 12 10% 9%)/.05), 0 0 80px hsl(var(--neutral-900, 12 10% 9%)/.17); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gc-core-${uid}, .gc-node-${uid} { animation: none !important; }
        }
      `}</style>

      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          {nodes.map((nd, i) => {
            const hot = hovered === nd.id || selectedId === nd.id;
            return (
              <linearGradient key={i} id={`gc-grad-${uid}-${i}`} x1={cx} y1={cy} x2={nd.x} y2={nd.y} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={`hsl(var(--sphere-${nd.sphere}))`} stopOpacity="0" />
                <stop offset="55%" stopColor={`hsl(var(--sphere-${nd.sphere}))`} stopOpacity={hot ? 0.5 : 0.2} />
                <stop offset="100%" stopColor={`hsl(var(--sphere-${nd.sphere}))`} stopOpacity={hot ? 0.85 : 0.4} />
              </linearGradient>
            );
          })}
        </defs>

        {rings.map((m, i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rxBase * m} ry={ryBase * m}
            fill="none" stroke="hsl(var(--border-subtle))" strokeWidth="1.25"
            strokeDasharray="1.5 11" opacity={0.6 - i * 0.15} />
        ))}

        {nodes.map((nd, i) => {
          const hot = selectedId === nd.id || hovered === nd.id;
          const mx = (cx + nd.x) / 2, my = (cy + nd.y) / 2;
          const dx = nd.x - cx, dy = nd.y - cy;
          const len = Math.hypot(dx, dy) || 1;
          const bow = 14;
          const ctrlX = mx + (-dy / len) * bow;
          const ctrlY = my + (dx / len) * bow;
          return (
            <path key={i}
              d={`M ${cx} ${cy} Q ${ctrlX} ${ctrlY} ${nd.x} ${nd.y}`}
              fill="none"
              stroke={`url(#gc-grad-${uid}-${i})`}
              strokeLinecap="round"
              strokeWidth={hot ? 2.5 : 1.6}
              style={{ transition: 'stroke-width .25s ease' }}
            />
          );
        })}
      </svg>

      {nodes.map((nd, i) => {
        const col = `hsl(var(--sphere-${nd.sphere}))`;
        const soft = `hsl(var(--sphere-${nd.sphere}-soft))`;
        const active = selectedId === nd.id || hovered === nd.id;
        const cosA = Math.cos(nd.a), sinA = Math.sin(nd.a);
        const gap = 14;
        const lx = nd.r + (nd.r + gap) * cosA;
        const ly = nd.r + (nd.r + gap) * sinA;

        let tx: string, align: 'left' | 'right' | 'center';
        if (cosA > 0.28) { tx = '0%'; align = 'left'; }
        else if (cosA < -0.28) { tx = '-100%'; align = 'right'; }
        else { tx = '-50%'; align = 'center'; }
        const ty = sinA < -0.28 ? '-100%' : sinA > 0.28 ? '0%' : '-50%';
        const delay = 0.08 + nd.i * 0.04;

        const prog = Math.max(0, Math.min(1, nd.progress == null ? 0 : nd.progress));
        const D = nd.r * 2;

        return (
          <button key={nd.id || i}
            onClick={() => onSelect?.(nd)}
            onMouseEnter={() => setHovered(nd.id ?? null)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`${nd.title} — ${Math.round(prog * 100)}%`}
            style={{
              position: 'absolute', left: nd.x, top: nd.y,
              width: D, height: D,
              transform: 'translate(-50%, -50%)',
              border: 'none', background: 'transparent', padding: 0,
              cursor: 'pointer', zIndex: active ? 3 : 2,
            }}
          >
            <span style={{
              display: 'block', position: 'relative',
              width: '100%', height: '100%', borderRadius: '50%',
              overflow: 'hidden',
              transform: active ? 'scale(1.09)' : 'scale(1)',
              animation: reduce ? 'none' : `gc-pop-${uid} .6s ${ease} ${delay}s backwards`,
              border: `2px solid ${active ? col : `hsl(var(--sphere-${nd.sphere}) / .8)`}`,
              background: `radial-gradient(circle at 34% 28%, hsl(var(--surface-card)) 0%, ${soft} 70%, ${soft} 100%)`,
              filter: active
                ? `drop-shadow(0 12px 26px hsl(var(--sphere-${nd.sphere}) / .5))`
                : `drop-shadow(0 6px 16px hsl(var(--sphere-${nd.sphere}) / .26))`,
              transition: 'transform .28s ease, filter .28s ease, border-color .28s ease',
            }}>
              {/* liquid fill */}
              <span style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                height: `${prog * 100}%`,
                background: `linear-gradient(180deg, hsl(var(--sphere-${nd.sphere}) / .82) 0%, ${col} 60%)`,
                borderTop: prog > 0 && prog < 1 ? `1.5px solid hsl(var(--sphere-${nd.sphere}) / .55)` : 'none',
                transition: reduce ? 'none' : `height .9s ${ease} ${delay + 0.3}s`,
              }} />
              {/* gloss */}
              <span style={{
                position: 'absolute', left: '22%', top: '16%', width: '36%', height: '28%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, hsl(0 0% 100% / .8) 0%, hsl(0 0% 100% / 0) 70%)',
                pointerEvents: 'none',
              }} />
              {/* % on hover */}
              <span style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: Math.max(9, nd.r * 0.36), fontWeight: 700,
                color: 'hsl(var(--text-strong))', textShadow: '0 1px 2px hsl(0 0% 100% / .55)',
                opacity: active ? 1 : 0, transition: 'opacity .2s ease', pointerEvents: 'none',
              }}>{Math.round(prog * 100)}%</span>
            </span>

            {/* label */}
            <span style={{
              position: 'absolute', left: lx, top: ly, width: 158,
              transform: `translate(${tx}, ${ty})`,
              textAlign: align, pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14.5, lineHeight: 1.22,
                color: active ? 'hsl(var(--text-strong))' : 'hsl(var(--text-body))',
                letterSpacing: '-0.005em',
              }}>{nd.title}</span>
              {nd.note && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 500,
                  color: col, letterSpacing: '0.01em',
                  display: 'inline-flex', gap: 4,
                  justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
                }}>
                  {nd.overdue ? '⚠ ' : ''}{nd.note}
                </span>
              )}
              {nd.done != null && nd.total != null && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: `hsl(var(--sphere-${nd.sphere}) / .7)`,
                  display: 'flex', gap: 4,
                  justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
                }}>
                  {nd.done} з {nd.total}
                </span>
              )}
            </span>
          </button>
        );
      })}

      {/* Centre «Я» core */}
      <div className={`gc-core-${uid}`} style={{
        position: 'absolute', left: cx, top: cy,
        transform: 'translate(-50%, -50%)',
        width: 142, height: 142, borderRadius: '50%',
        background: 'radial-gradient(circle at 36% 28%, hsl(18 42% 46%) 0%, hsl(346 30% 30%) 48%, hsl(266 34% 22%) 100%)',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 4,
        boxShadow: '0 20px 48px rgba(0,0,0,.18), inset 0 2px 12px hsl(40 60% 88% / .22), inset 0 -16px 30px hsl(280 40% 8% / .5), 0 0 0 12px hsl(300 20% 50% / .06), 0 18px 48px hsl(290 30% 30% / .3)',
        animation: reduce ? 'none' : `gc-core-${uid} 6s ease-in-out infinite`,
      }}>
        {centerNode || (
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 22, letterSpacing: '0.01em', color: 'hsl(40 50% 97%)', lineHeight: 1.05 }}>mary</span>
            <span style={{ width: 30, height: 1, background: 'hsl(40 40% 92% / .4)', margin: '3px 0' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 15, letterSpacing: '0.32em', textIndent: '0.32em', color: 'hsl(38 30% 96% / .72)' }}>life</span>
          </span>
        )}
      </div>
    </div>
  );
}
