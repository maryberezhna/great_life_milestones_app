'use client';

import React, {
  useEffect, useRef, useState, useCallback, useLayoutEffect,
} from 'react';
import type { ConstellationGoal, ConstellationSphere } from './GoalConstellation';

// ── types ──────────────────────────────────────────────────────────────────

interface SphereNode {
  id: string; type: 'sphere';
  key: string; name: string; icon: string;
  x: number; y: number; vx: number; vy: number; r: number;
}
interface GoalNode {
  id: string; type: 'goal';
  sphere: string; title: string;
  x: number; y: number; vx: number; vy: number; r: number;
  goal: ConstellationGoal;
}
type SimNode = SphereNode | GoalNode;
interface Edge { a: string; b: string; }

export interface ObsidianGraphProps {
  goals: ConstellationGoal[];
  spheres?: ConstellationSphere[];
  onSelect?: (goal: ConstellationGoal) => void;
  selectedId?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

// ── colors ─────────────────────────────────────────────────────────────────

const SPHERE_COLOR: Record<string, string> = {
  violet: '#a78bfa', amber: '#fbbf24', sage: '#34d399',
  rose: '#f472b6',   blue:  '#60a5fa', teal: '#2dd4bf',
  clay:  '#fb923c',  indigo: '#818cf8',
};
function sc(key: string) { return SPHERE_COLOR[key] ?? '#9ca3af'; }

// ── progress pie ───────────────────────────────────────────────────────────

function piePath(cx: number, cy: number, r: number, p: number): string {
  if (p <= 0) return '';
  if (p >= 0.9999) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`;
  const a = -Math.PI / 2 + 2 * Math.PI * p;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)} Z`;
}

// ── build graph ────────────────────────────────────────────────────────────

function buildGraph(
  goals: ConstellationGoal[],
  spheres: ConstellationSphere[],
  cx: number, cy: number,
): { nodes: SimNode[]; edges: Edge[] } {
  const usedSphereKeys = new Set(goals.map(g => g.sphere));
  // Deduplicate by key — old spheres may share a color key with new ones
  const seenKeys = new Set<string>();
  const activeSpheres = spheres.filter(s => {
    if (usedSphereKeys.has(s.key) && !seenKeys.has(s.key)) {
      seenKeys.add(s.key); return true;
    }
    return false;
  });

  // Sphere hub nodes placed in a loose ring
  const sNodes: SphereNode[] = activeSpheres.map((s, i) => {
    const a = (i / Math.max(activeSpheres.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const dist = Math.min(cx, cy) * 0.38;
    return {
      id: `sphere:${s.key}`, type: 'sphere' as const,
      key: s.key, name: s.name, icon: String(s.icon ?? ''),
      x: cx + Math.cos(a) * dist, y: cy + Math.sin(a) * dist,
      vx: 0, vy: 0, r: 13,
    };
  });

  // Goal nodes placed in a wider ring, grouped by sphere
  const byKey = new Map<string, ConstellationGoal[]>();
  for (const g of goals) {
    if (!byKey.has(g.sphere)) byKey.set(g.sphere, []);
    byKey.get(g.sphere)!.push(g);
  }

  const gNodes: GoalNode[] = [];
  let globalIdx = 0;
  for (const [key, gs] of byKey) {
    const sIdx = activeSpheres.findIndex(s => s.key === key);
    const sAngle = (sIdx / Math.max(activeSpheres.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const dist = Math.min(cx, cy) * 0.72;
    gs.forEach((g, li) => {
      const spread = (gs.length > 1 ? (li / (gs.length - 1) - 0.5) : 0) * 0.7;
      const a = sAngle + spread;
      gNodes.push({
        id: g.id ?? `g${globalIdx}`,
        type: 'goal' as const,
        sphere: g.sphere, title: g.title,
        x: cx + Math.cos(a) * dist,
        y: cy + Math.sin(a) * dist,
        vx: 0, vy: 0,
        r: 10 + (g.weight ?? 1) * 6,
        goal: g,
      });
      globalIdx++;
    });
  }

  const nodes: SimNode[] = [...sNodes, ...gNodes];

  // Edges: each goal → its sphere hub
  const edges: Edge[] = gNodes.map(n => ({ a: n.id, b: `sphere:${n.sphere}` }));

  return { nodes, edges };
}

// ── simulation ─────────────────────────────────────────────────────────────

function simulate(nodes: SimNode[], edges: Edge[], cx: number, cy: number, iters = 500) {
  const idx = new Map(nodes.map((n, i) => [n.id, i]));

  for (let it = 0; it < iters; it++) {
    const alpha = Math.pow(1 - it / iters, 1.5);

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x || 0.01, dy = b.y - a.y || 0.01;
        const d2 = dx * dx + dy * dy;
        const d = Math.sqrt(d2) || 0.01;
        const f = (22000 / Math.max(d2, 1)) * alpha;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    // Spring attraction along edges
    for (const e of edges) {
      const ai = idx.get(e.a), bi = idx.get(e.b);
      if (ai == null || bi == null) continue;
      const a = nodes[ai], b = nodes[bi];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const REST = (a.r + b.r) * 2.2;
      const f = (d - REST) * 0.06 * alpha;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    // Gravity toward center + integrate + clamp to canvas bounds
    const W = cx * 2, H = cy * 2;
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.006 * alpha;
      n.vy += (cy - n.y) * 0.006 * alpha;
      n.x += n.vx; n.y += n.vy;
      n.vx *= 0.72; n.vy *= 0.72;
      // keep inside canvas
      const pad = n.r + 40;
      if (n.x < pad)     { n.x = pad;     n.vx *= -0.3; }
      if (n.x > W - pad) { n.x = W - pad; n.vx *= -0.3; }
      if (n.y < pad)     { n.y = pad;     n.vy *= -0.3; }
      if (n.y > H - pad) { n.y = H - pad; n.vy *= -0.3; }
    }

    // Position-based collision resolution
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x || 0.01, dy = b.y - a.y || 0.01;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minD = a.r + b.r + 8;
        if (d < minD) {
          const push = (minD - d) / 2;
          const nx = (dx / d) * push, ny = (dy / d) * push;
          a.x -= nx; a.y -= ny;
          b.x += nx; b.y += ny;
        }
      }
    }
  }
}

// ── component ──────────────────────────────────────────────────────────────

export function ObsidianGraph({
  goals, spheres = [], onSelect, selectedId, className, style,
}: ObsidianGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [svgOpacity, setSvgOpacity] = useState(1);
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const dragNode = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const panning = useRef(false);
  const dragMoved = useRef(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (size.w < 10 || goals.length === 0) return;
    setSvgOpacity(0.3);
    const t = setTimeout(() => {
      const { nodes: ns, edges: es } = buildGraph(goals, spheres, size.w / 2, size.h / 2);
      simulate(ns, es, size.w / 2, size.h / 2, 500);
      setNodes(ns);
      setEdges(es);
      setSvgOpacity(1);
    }, 200);
    return () => clearTimeout(t);
  }, [goals, spheres, size.w, size.h]);

  const onBgDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    panning.current = true;
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const onNodeDown = useCallback((e: React.MouseEvent, n: SimNode) => {
    e.stopPropagation();
    dragMoved.current = false;
    dragNode.current = { id: n.id, ox: n.x, oy: n.y, mx: e.clientX, my: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragNode.current) {
      const d = dragNode.current;
      const dx = e.clientX - d.mx, dy = e.clientY - d.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
      setNodes(ns => ns.map(n => n.id === d.id
        ? { ...n, x: d.ox + dx, y: d.oy + dy } : n));
    } else if (panning.current && panStart.current) {
      const s = panStart.current;
      setPan({ x: s.px + e.clientX - s.mx, y: s.py + e.clientY - s.my });
    }
  }, []);

  const onMouseUp = useCallback(() => {
    dragNode.current = null; panning.current = false; panStart.current = null;
  }, []);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative', width: '100%', height: '100%',
        overflow: 'hidden', background: '#0f0d10',
        cursor: panning.current ? 'grabbing' : 'grab',
        ...style,
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onMouseDown={onBgDown}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, #1a1520 0%, #0f0d10 100%)',
      }} />

      <svg
        width={size.w} height={size.h}
        style={{
          position: 'absolute', inset: 0,
          transform: `translate(${pan.x}px,${pan.y}px)`,
          opacity: svgOpacity,
          transition: 'opacity 0.35s ease',
        }}
      >
        <defs>
          <filter id="og-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="og-hub-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Edges ── */}
        {edges.map(e => {
          const na = nodeMap.get(e.a), nb = nodeMap.get(e.b);
          if (!na || !nb) return null;
          const col = sc(na.type === 'goal' ? (na as GoalNode).sphere : (na as SphereNode).key);
          const active = hovered === e.a || hovered === e.b
            || selectedId === (na.type === 'goal' ? (na as GoalNode).goal?.id : null)
            || selectedId === (nb.type === 'goal' ? (nb as GoalNode).goal?.id : null);
          return (
            <line key={`${e.a}-${e.b}`}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={active ? col : 'rgba(255,255,255,0.10)'}
              strokeWidth={active ? 1.2 : 0.6}
              style={{ transition: 'stroke .2s, stroke-width .2s' }}
            />
          );
        })}

        {/* ── Goal nodes ── */}
        {nodes.filter(n => n.type === 'goal').map(n => {
          const gn = n as GoalNode;
          const col = sc(gn.sphere);
          const isSelected = selectedId === gn.goal?.id;
          const isHovered = hovered === gn.id;
          const active = isSelected || isHovered;
          const prog = Math.max(0, Math.min(1, gn.goal?.progress ?? 0));
          const r = active ? gn.r * 1.12 : gn.r;

          // Label angle from center of canvas
          const cx = size.w / 2, cy = size.h / 2;
          const angle = Math.atan2(gn.y - cy, gn.x - cx);
          const labelDist = r + 10;
          const lx = gn.x + Math.cos(angle) * labelDist;
          const ly = gn.y + Math.sin(angle) * labelDist;
          const anchor = Math.cos(angle) > 0.15 ? 'start' : Math.cos(angle) < -0.15 ? 'end' : 'middle';

          return (
            <g key={gn.id}
              style={{ cursor: 'pointer' }}
              filter={active ? 'url(#og-glow)' : undefined}
              onMouseEnter={() => setHovered(gn.id)}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={e => onNodeDown(e, gn)}
              onClick={() => { if (!dragMoved.current && gn.goal) onSelect?.(gn.goal); }}
            >
              {/* Background circle */}
              <circle cx={gn.x} cy={gn.y} r={r}
                fill={col} fillOpacity={isSelected ? 0.32 : 0.14}
                stroke={col} strokeWidth={isSelected ? 1.8 : 1}
                strokeOpacity={active ? 0.9 : 0.55}
                style={{ transition: 'all .2s ease' }}
              />
              {/* Progress pie */}
              {prog > 0 && (
                <path d={piePath(gn.x, gn.y, r, prog)}
                  fill={col} fillOpacity={active ? 0.55 : 0.35}
                  style={{ transition: 'fill-opacity .2s' }}
                />
              )}
              {/* Label */}
              <text
                x={lx} y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill={active ? col : 'rgba(255,255,255,0.72)'}
                fontSize={active ? 13 : 12}
                fontWeight={active ? 600 : 400}
                fontFamily="var(--font-sans, system-ui)"
                style={{ transition: 'fill .2s, font-size .2s', pointerEvents: 'none', userSelect: 'none' }}
              >
                {gn.title}
              </text>
              {/* Progress badge (done/total) */}
              {(gn.goal?.total ?? 0) > 0 && (
                <text
                  x={gn.x} y={gn.y + r + 14}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={col} fillOpacity={0.6} fontSize={10}
                  fontFamily="var(--font-mono, monospace)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {gn.goal?.done}/{gn.goal?.total}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Sphere hub nodes ── */}
        {nodes.filter(n => n.type === 'sphere').map(n => {
          const sn = n as SphereNode;
          const col = sc(sn.key);
          const isHovered = hovered === sn.id;
          const hasSelected = selectedId
            ? nodes.some(gn => gn.type === 'goal' && (gn as GoalNode).sphere === sn.key && (gn as GoalNode).goal?.id === selectedId)
            : false;
          const active = isHovered || hasSelected;
          const r = active ? sn.r * 1.15 : sn.r;

          return (
            <g key={sn.id}
              filter={active ? 'url(#og-hub-glow)' : undefined}
              onMouseEnter={() => setHovered(sn.id)}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={e => onNodeDown(e, sn)}
              style={{ cursor: 'grab' }}
            >
              <circle cx={sn.x} cy={sn.y} r={r}
                fill={col} fillOpacity={active ? 0.9 : 0.7}
                style={{ transition: 'all .22s ease' }}
              />
              {/* Icon */}
              <text x={sn.x} y={sn.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={r * 0.9} style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {sn.icon}
              </text>
              {/* Sphere name */}
              <text
                x={sn.x} y={sn.y + r + 11}
                textAnchor="middle" dominantBaseline="middle"
                fill={col} fillOpacity={active ? 1 : 0.75}
                fontSize={11} fontWeight={700}
                fontFamily="var(--font-sans, system-ui)"
                letterSpacing="0.04em"
                style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase', transition: 'fill-opacity .2s' }}
              >
                {sn.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
