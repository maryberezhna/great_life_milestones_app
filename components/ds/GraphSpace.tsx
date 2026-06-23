'use client';

import { useRef, useEffect, useState } from 'react';

interface GoalNode { id: string; title: string; sphereKey: string; targetDate: string | null; complexity: string; }
interface Sector { key: string; name: string; icon: string; goals: GoalNode[]; }

const NOW = Date.now();

function deadlineRadius(targetDate: string | null, minR: number, maxR: number): number {
  if (!targetDate) return minR + (maxR - minR) * 0.65;
  const days = (new Date(targetDate).getTime() - NOW) / 86_400_000;
  if (days <= 0)   return minR * 0.85;
  if (days < 30)   return minR + (maxR - minR) * 0.12;
  if (days < 90)   return minR + (maxR - minR) * 0.32;
  if (days < 180)  return minR + (maxR - minR) * 0.55;
  if (days < 365)  return minR + (maxR - minR) * 0.78;
  return maxR;
}

function nodeR(complexity: string): number {
  if (complexity === 'hard')   return 16;
  if (complexity === 'medium') return 10;
  return 6;
}

function wrapText(text: string, maxChars = 15): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

export function GraphSpace({ sectors }: { sectors: Sector[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 680 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => {
      const { width, height } = e[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Non-passive wheel so we can preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.07 : 0.93;
      const z = zoomRef.current;
      const p = panRef.current;
      const newZ = Math.max(0.4, Math.min(3.5, z * factor));
      setZoom(newZ);
      setPan({
        x: mx - (mx - p.x) * (newZ / z),
        y: my - (my - p.y) * (newZ / z),
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const { w, h } = dims;
  const cx = w / 2, cy = h / 2;
  const EDGE_PAD = 150;
  const maxR = Math.min(cx - EDGE_PAD, cy - EDGE_PAD);
  const minR = maxR * 0.22;

  const totalGoals = sectors.reduce((s, sec) => s + sec.goals.length, 0);
  if (totalGoals === 0) return null;

  const GAP_RAD = (10 * Math.PI) / 180;
  const available = 2 * Math.PI - GAP_RAD * sectors.filter(s => s.goals.length).length;

  interface ND {
    goalId: string; title: string; key: string; targetDate: string | null;
    angle: number; r: number; x: number; y: number; nr: number;
  }
  interface SL { key: string; name: string; icon: string; x: number; y: number; midAngle: number; }

  const nodes: ND[] = [];
  const sphereLabels: SL[] = [];
  let angle = -Math.PI / 2;

  for (const sec of sectors) {
    if (!sec.goals.length) continue;
    const span = (sec.goals.length / totalGoals) * available;
    const midAngle = angle + span / 2;
    const slDist = Math.min(maxR + 52, Math.min(cx, cy) - 24);
    sphereLabels.push({
      key: sec.key, name: sec.name, icon: sec.icon, midAngle,
      x: cx + Math.cos(midAngle) * slDist,
      y: cy + Math.sin(midAngle) * slDist,
    });
    const step = span / sec.goals.length;
    for (let i = 0; i < sec.goals.length; i++) {
      const g = sec.goals[i];
      const a = angle + step * (i + 0.5);
      const r = deadlineRadius(g.targetDate, minR, maxR);
      nodes.push({
        goalId: g.id, title: g.title, key: sec.key, targetDate: g.targetDate,
        angle: a, r, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
        nr: nodeR(g.complexity),
      });
    }
    angle += span + GAP_RAD;
  }

  // Map a content-space point to current screen position
  const toScreen = (x: number, y: number) => ({
    sx: pan.x + zoom * x,
    sy: pan.y + zoom * y,
  });

  const LABEL_GAP = 11;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={e => {
        if (e.button !== 0) return;
        dragRef.current = { startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y };
        setDragging(true);
      }}
      onMouseMove={e => {
        if (!dragRef.current) return;
        setPan({
          x: dragRef.current.px + e.clientX - dragRef.current.startX,
          y: dragRef.current.py + e.clientY - dragRef.current.startY,
        });
      }}
      onMouseUp={() => { dragRef.current = null; setDragging(false); }}
      onMouseLeave={() => { dragRef.current = null; setDragging(false); }}
    >
      {/* Zoom buttons */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(['+', '−', '⊙'] as const).map((label, i) => (
          <button
            key={label}
            onMouseDown={e => e.stopPropagation()}
            onClick={() => {
              if (i === 2) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
              const factor = i === 0 ? 1.3 : 0.77;
              const z = zoomRef.current;
              const p = panRef.current;
              const newZ = Math.max(0.4, Math.min(3.5, z * factor));
              setZoom(newZ);
              setPan({
                x: w / 2 - (w / 2 - p.x) * (newZ / z),
                y: h / 2 - (h / 2 - p.y) * (newZ / z),
              });
            }}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid hsl(var(--border-subtle))',
              background: 'hsl(var(--surface-card))',
              color: 'hsl(var(--text-muted))',
              fontSize: i < 2 ? 20 : 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-sans)', lineHeight: 1,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >{label}</button>
        ))}
      </div>

      {/* ── LAYER 1: zoom-transformed SVG (lines + rings + center) ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: w, height: h,
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
      }}>
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
          {nodes.map(n => (
            <line key={`l-${n.goalId}`}
              x1={cx} y1={cy} x2={n.x} y2={n.y}
              stroke={`hsl(var(--sphere-${n.key}))`}
              strokeWidth={hovered === n.goalId ? 1.5 : 0.85}
              opacity={hovered ? (hovered === n.goalId ? 0.6 : 0.08) : 0.22}
              style={{ transition: 'opacity 0.18s' }}
            />
          ))}
          {[0.22, 0.45, 0.72].map(frac => (
            <circle key={frac} cx={cx} cy={cy} r={minR + (maxR - minR) * frac}
              fill="none" stroke="hsl(var(--border-subtle))" strokeWidth={1}
              strokeDasharray="3 6" opacity={0.35} />
          ))}
          <circle cx={cx} cy={cy} r={20} fill="hsl(var(--text-strong))"
            filter="drop-shadow(0 3px 10px rgba(0,0,0,0.2))" />
          <text x={cx} y={cy} dy="0.38em" textAnchor="middle"
            fontSize={13} fill="white" fontFamily="Manrope,sans-serif">✦</text>
        </svg>
      </div>

      {/* ── LAYER 2: goal circles — screen-space, scale with zoom ── */}
      {nodes.map(n => {
        const { sx, sy } = toScreen(n.x, n.y);
        const isH = hovered === n.goalId;
        const isFaded = hovered !== null && !isH;
        const accent = `hsl(var(--sphere-${n.key}))`;
        const soft = `hsl(var(--sphere-${n.key}-soft))`;
        // Circles grow with zoom but cap at 2× to stay readable
        const circleFactor = Math.min(zoom, 2);
        const d = Math.max(6, n.nr * 2 * circleFactor);
        const half = d / 2;
        return (
          <a key={`c-${n.goalId}`} href={`/goals/${n.goalId}`}
            onMouseDown={e => e.stopPropagation()}
            onMouseEnter={() => setHovered(n.goalId)}
            onMouseLeave={() => setHovered(null)}
            style={{
              textDecoration: 'none', position: 'absolute',
              left: sx - half, top: sy - half, width: d, height: d,
              opacity: isFaded ? 0.25 : 1, transition: 'opacity 0.18s', zIndex: 2,
            }}
          >
            <div style={{
              width: d, height: d, borderRadius: '50%',
              background: isH ? accent : soft,
              border: `${Math.min(2.5, 2 * circleFactor)}px solid ${accent}`,
              transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
              transform: isH ? 'scale(1.4)' : 'scale(1)',
              boxShadow: isH
                ? `0 4px 16px color-mix(in srgb, ${accent} 45%, transparent)`
                : `0 1px 5px color-mix(in srgb, ${accent} 16%, transparent)`,
            }} />
          </a>
        );
      })}

      {/* ── LAYER 3: sphere labels — screen-space, fixed text size ── */}
      {sphereLabels.map(sl => {
        const { sx, sy } = toScreen(sl.x, sl.y);
        const cosA = Math.cos(sl.midAngle), sinA = Math.sin(sl.midAngle);
        const tx = cosA > 0.25 ? 0 : cosA < -0.25 ? -100 : -50;
        const ty = sinA > 0.25 ? 0 : sinA < -0.25 ? -100 : -50;
        return (
          <div key={sl.key} style={{
            position: 'absolute', left: sx, top: sy,
            transform: `translate(${tx}%, ${ty}%)`,
            display: 'flex', alignItems: 'center', gap: 4,
            pointerEvents: 'none', zIndex: 4,
          }}>
            <span style={{ fontSize: 13 }}>{sl.icon}</span>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase',
              color: `hsl(var(--sphere-${sl.key}))`, whiteSpace: 'nowrap',
            }}>{sl.name}</span>
          </div>
        );
      })}

      {/* ── LAYER 4: goal labels — screen-space, fixed text size ── */}
      {nodes.map(n => {
        const isH = hovered === n.goalId;
        const isFaded = hovered !== null && !isH;
        const cosA = Math.cos(n.angle), sinA = Math.sin(n.angle);
        // Label anchor is LABEL_GAP px past the circle edge, in content space
        const lx = n.x + cosA * (n.nr + LABEL_GAP);
        const ly = n.y + sinA * (n.nr + LABEL_GAP);
        const { sx, sy } = toScreen(lx, ly);

        let transform: string;
        let textAlign: 'left' | 'right' | 'center';
        if (Math.abs(cosA) >= 0.42) {
          transform = cosA > 0 ? 'translateY(-50%)' : 'translate(-100%, -50%)';
          textAlign = cosA > 0 ? 'left' : 'right';
        } else {
          transform = sinA > 0 ? 'translateX(-50%)' : 'translate(-50%, -100%)';
          textAlign = 'center';
        }

        const lines = wrapText(n.title);
        const urgencyLabel = (() => {
          if (!n.targetDate) return null;
          const days = (new Date(n.targetDate).getTime() - NOW) / 86_400_000;
          if (days <= 0) return '⚠ прострочено';
          if (days < 30) return `${Math.round(days)} дн.`;
          if (days < 90) return new Date(n.targetDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
          return null;
        })();

        return (
          <a key={`t-${n.goalId}`} href={`/goals/${n.goalId}`}
            onMouseDown={e => e.stopPropagation()}
            onMouseEnter={() => setHovered(n.goalId)}
            onMouseLeave={() => setHovered(null)}
            style={{
              textDecoration: 'none', position: 'absolute',
              left: sx, top: sy, transform, width: 110,
              opacity: isFaded ? 0.2 : 1, transition: 'opacity 0.18s', zIndex: 3,
            }}
          >
            {lines.map((line, i) => (
              <span key={i} style={{
                display: 'block', textAlign,
                fontFamily: 'var(--font-sans)', fontSize: 12,
                fontWeight: isH ? 600 : 450, lineHeight: 1.32,
                color: isH ? `hsl(var(--sphere-${n.key}))` : 'hsl(var(--text-body))',
                transition: 'color 0.15s',
              }}>{line}</span>
            ))}
            {urgencyLabel && (
              <span style={{
                display: 'block', textAlign,
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: `hsl(var(--sphere-${n.key}))`, opacity: 0.75, marginTop: 2,
              }}>{urgencyLabel}</span>
            )}
          </a>
        );
      })}
    </div>
  );
}
