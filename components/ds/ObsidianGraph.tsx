'use client';

import React, {
  useEffect, useRef, useLayoutEffect, useState, useCallback,
} from 'react';
import type { ConstellationGoal, ConstellationSphere } from './GoalConstellation';

// ── types ──────────────────────────────────────────────────────────────────

export interface ObsidianGraphProps {
  goals: ConstellationGoal[];
  spheres?: ConstellationSphere[];
  onSelect?: (goal: ConstellationGoal) => void;
  selectedId?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

interface Node {
  id: string;
  type: 'sphere' | 'goal';
  label: string;
  sphereKey: string;
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  goal?: ConstellationGoal;
}
interface Edge { a: string; b: string; type: 'member' | 'dep'; }

// ── palette ────────────────────────────────────────────────────────────────

const C: Record<string, string> = {
  violet: '#a78bfa', amber: '#fbbf24', sage: '#34d399',
  rose:   '#f472b6', blue:  '#60a5fa', teal:  '#2dd4bf',
  clay:   '#fb923c', indigo:'#818cf8',
};
const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
};
function col(key: string) { return C[key] ?? '#9ca3af'; }

// ── position store ─────────────────────────────────────────────────────────

const POS_KEY = 'og-positions-v2';
function loadPos(): Record<string,{x:number;y:number}> {
  try { return JSON.parse(localStorage.getItem(POS_KEY) ?? '{}'); } catch { return {}; }
}
function savePos(nodes: Node[]) {
  const m: Record<string,{x:number;y:number}> = {};
  nodes.forEach(n => { m[n.id] = {x: n.x, y: n.y}; });
  localStorage.setItem(POS_KEY, JSON.stringify(m));
}

// ── graph builder ──────────────────────────────────────────────────────────

function buildGraph(
  goals: ConstellationGoal[],
  spheres: ConstellationSphere[],
  W: number, H: number,
): { nodes: Node[]; edges: Edge[] } {
  const usedKeys = new Set(goals.map(g => g.sphere));
  const seenKeys = new Set<string>();
  const activeSpheres = spheres.filter(s => {
    if (usedKeys.has(s.key) && !seenKeys.has(s.key)) { seenKeys.add(s.key); return true; }
    return false;
  });

  const cx = W / 2, cy = H / 2;
  const saved = loadPos();

  // Sphere hub nodes
  const sNodes: Node[] = activeSpheres.map((s, i) => {
    const a = (i / Math.max(activeSpheres.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const d = Math.min(cx, cy) * 0.32;
    const sx = saved[`sphere:${s.key}`]?.x ?? cx + Math.cos(a) * d;
    const sy = saved[`sphere:${s.key}`]?.y ?? cy + Math.sin(a) * d;
    return { id: `sphere:${s.key}`, type: 'sphere', label: s.name,
      sphereKey: s.key, x: sx, y: sy, vx: 0, vy: 0, r: 7 };
  });

  // Goal nodes
  const byKey = new Map<string, ConstellationGoal[]>();
  for (const g of goals) {
    if (!byKey.has(g.sphere)) byKey.set(g.sphere, []);
    byKey.get(g.sphere)!.push(g);
  }

  const gNodes: Node[] = [];
  let gi = 0;
  for (const [key, gs] of byKey) {
    const si = activeSpheres.findIndex(s => s.key === key);
    const sa = (si / Math.max(activeSpheres.length,1)) * Math.PI * 2 - Math.PI / 2;
    const d = Math.min(cx, cy) * 0.65;
    gs.forEach((g, li) => {
      const spread = gs.length > 1 ? ((li / (gs.length - 1)) - 0.5) * 0.8 : 0;
      const a = sa + spread;
      const gid = g.id ?? `g${gi}`;
      const gx = saved[gid]?.x ?? cx + Math.cos(a) * d;
      const gy = saved[gid]?.y ?? cy + Math.sin(a) * d;
      const w = g.weight ?? 1;
      gNodes.push({ id: gid, type: 'goal', label: g.title,
        sphereKey: key, x: gx, y: gy, vx: 0, vy: 0,
        r: 4 + w * 1.8, goal: g });
      gi++;
    });
  }

  const nodes = [...sNodes, ...gNodes];
  const edges: Edge[] = gNodes.map(n => ({ a: n.id, b: `sphere:${n.sphereKey}`, type: 'member' as const }));

  // Dependency edges
  for (const g of goals) {
    if ((g as any).depends_on_id) {
      edges.push({ a: g.id!, b: (g as any).depends_on_id, type: 'dep' });
    }
  }

  return { nodes, edges };
}

// ── physics ────────────────────────────────────────────────────────────────

function physicsStep(nodes: Node[], edges: Edge[], cx: number, cy: number, alpha: number) {
  const W = cx * 2, H = cy * 2;
  const idx = new Map(nodes.map((n,i) => [n.id, i]));

  // Repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i+1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = b.x - a.x || 0.01, dy = b.y - a.y || 0.01;
      const d2 = dx*dx + dy*dy || 0.0001;
      const d = Math.sqrt(d2);
      const f = (6000 / Math.max(d2, 1)) * alpha;
      const fx = (dx/d)*f, fy = (dy/d)*f;
      a.vx -= fx; a.vy -= fy;
      b.vx += fx; b.vy += fy;
    }
  }

  // Spring edges
  for (const e of edges) {
    const ai = idx.get(e.a), bi = idx.get(e.b);
    if (ai == null || bi == null) continue;
    const a = nodes[ai], b = nodes[bi];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 0.01;
    const REST = e.type === 'dep' ? 120 : (a.r + b.r) * 4;
    const f = (d - REST) * 0.04 * alpha;
    const fx = (dx/d)*f, fy = (dy/d)*f;
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  }

  // Gravity + integrate + clamp
  for (const n of nodes) {
    n.vx += (cx - n.x) * 0.004 * alpha;
    n.vy += (cy - n.y) * 0.004 * alpha;
    n.x += n.vx; n.y += n.vy;
    n.vx *= 0.78; n.vy *= 0.78;
    const pad = n.r + 30;
    if (n.x < pad)     { n.x = pad;     n.vx *= -0.4; }
    if (n.x > W - pad) { n.x = W - pad; n.vx *= -0.4; }
    if (n.y < pad)     { n.y = pad;     n.vy *= -0.4; }
    if (n.y > H - pad) { n.y = H - pad; n.vy *= -0.4; }
  }

  // Position-based collision
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i+1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x || 0.01, dy = b.y - a.y || 0.01;
      const d = Math.sqrt(dx*dx + dy*dy) || 0.01;
      const minD = a.r + b.r + 5;
      if (d < minD) {
        const push = (minD - d) / 2;
        const nx = (dx/d)*push, ny = (dy/d)*push;
        a.x -= nx; a.y -= ny;
        b.x += nx; b.y += ny;
      }
    }
  }
}

// ── canvas draw ────────────────────────────────────────────────────────────

interface DrawState {
  hovered: string | null;
  pan: { x: number; y: number };
  zoom: number;
  selectedId: string | null | undefined;
}

function draw(
  canvas: HTMLCanvasElement,
  nodes: Node[],
  edges: Edge[],
  state: DrawState,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { hovered, pan, zoom, selectedId } = state;
  const W = canvas.width, H = canvas.height;

  // Background
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.7);
  bg.addColorStop(0, '#1a1825');
  bg.addColorStop(1, '#0d0c14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(pan.x + W/2, pan.y + H/2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W/2, -H/2);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // ── Edges ──
  for (const e of edges) {
    const na = nodeMap.get(e.a), nb = nodeMap.get(e.b);
    if (!na || !nb) continue;
    const c = col(na.sphereKey);
    const isActive = hovered === e.a || hovered === e.b
      || selectedId === (na.goal?.id ?? null)
      || selectedId === (nb.goal?.id ?? null);
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    if (e.type === 'dep') {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = isActive ? `rgba(${hexToRgb(c)},0.9)` : `rgba(${hexToRgb(c)},0.35)`;
      ctx.lineWidth = isActive ? 1.2 : 0.7;
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = isActive ? `rgba(${hexToRgb(c)},0.7)` : `rgba(255,255,255,0.10)`;
      ctx.lineWidth = isActive ? 0.9 : 0.5;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Goal nodes ──
  for (const n of nodes) {
    if (n.type !== 'goal') continue;
    const c = col(n.sphereKey);
    const rgb = hexToRgb(c);
    const isHov = hovered === n.id;
    const isSel = selectedId === n.goal?.id;
    const active = isHov || isSel;
    const r = n.r * (active ? 1.35 : 1);

    const total = n.goal?.total ?? 0;
    const done  = n.goal?.done  ?? 0;
    const hasProg = total > 0;
    const ringR = r + 5;

    // ── Progress ring (drawn behind node) ──
    if (hasProg) {
      const prog = done / total;
      const startA = -Math.PI / 2;

      // Track
      ctx.beginPath();
      ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arc
      if (prog > 0) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR, startA, startA + prog * Math.PI * 2);
        ctx.strokeStyle = active ? `rgba(${rgb},1)` : `rgba(${rgb},0.75)`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        if (active) { ctx.shadowColor = c; ctx.shadowBlur = 8; }
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.shadowBlur = 0;
      }
    }

    if (active) {
      ctx.shadowColor = c;
      ctx.shadowBlur = 18;
    }

    // Fill
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = active ? `rgba(${rgb},0.85)` : `rgba(${rgb},0.55)`;
    ctx.fill();

    // Selection ring
    if (isSel) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, (hasProg ? ringR : r) + 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb},0.9)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Label
    const labelOffset = hasProg ? ringR + 5 : r + 7;
    ctx.font = `${active ? 600 : 400} ${active ? 13 : 12}px var(--font-sans, system-ui)`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const lx = n.x + labelOffset;
    const ly = n.y;
    ctx.shadowColor = '#0d0c14';
    ctx.shadowBlur = 5;
    ctx.fillStyle = active ? c : 'rgba(255,255,255,0.78)';
    ctx.fillText(n.label, lx, ly);

    // Progress count (e.g. "2/5") shown below label when active
    if (hasProg && active) {
      ctx.font = `500 10px var(--font-sans, system-ui)`;
      ctx.fillStyle = `rgba(${rgb},0.7)`;
      ctx.fillText(`${done}/${total} кроків`, lx, ly + 14);
    }

    ctx.shadowBlur = 0;
  }

  // ── Sphere hub nodes ──
  for (const n of nodes) {
    if (n.type !== 'sphere') continue;
    const c = col(n.sphereKey);
    const rgb = hexToRgb(c);
    const isHov = hovered === n.id;
    const hasSel = selectedId
      ? nodes.some(g => g.type === 'goal' && g.sphereKey === n.sphereKey && g.goal?.id === selectedId)
      : false;
    const active = isHov || hasSel;
    const r = n.r * (active ? 1.3 : 1);

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${active ? 0.15 : 0.07})`;
    ctx.fill();

    if (active) { ctx.shadowColor = c; ctx.shadowBlur = 20; }

    // Filled circle
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${active ? 1 : 0.85})`;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label — always visible
    ctx.font = `700 ${active ? 13 : 12}px var(--font-sans, system-ui)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#0d0c14';
    ctx.shadowBlur = 5;
    ctx.fillStyle = active ? c : `rgba(${rgb},0.9)`;
    ctx.fillText(n.label.toUpperCase(), n.x, n.y + r + 6);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ── component ──────────────────────────────────────────────────────────────

export function ObsidianGraph({
  goals, spheres = [], onSelect, selectedId, className, style,
}: ObsidianGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const nodesRef     = useRef<Node[]>([]);
  const edgesRef     = useRef<Edge[]>([]);
  const rafRef       = useRef<number>(0);
  const iterRef      = useRef(0); // physics convergence counter
  const [size, setSize] = useState({ w: 0, h: 0 });

  const stateRef = useRef<DrawState & {
    drag: { id: string; ox: number; oy: number; mx: number; my: number } | null;
    panning: boolean;
    panStart: { mx: number; my: number; px: number; py: number } | null;
    dragMoved: boolean;
    cursor: string;
  }>({
    hovered: null, pan: { x: 0, y: 0 }, zoom: 1.6,
    selectedId: selectedId ?? null,
    drag: null, panning: false, panStart: null, dragMoved: false,
    cursor: 'grab',
  });

  // keep selectedId in sync without rebuilding
  useEffect(() => { stateRef.current.selectedId = selectedId ?? null; }, [selectedId]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Build graph when data/size changes
  useEffect(() => {
    if (size.w < 10 || goals.length === 0) return;
    const { nodes, edges } = buildGraph(goals, spheres, size.w, size.h);
    nodesRef.current = nodes;
    edgesRef.current = edges;
    iterRef.current = 0;
  }, [goals, spheres, size.w, size.h]);

  // RAF loop
  useEffect(() => {
    if (size.w < 10) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function tick() {
      const iter = iterRef.current;
      if (iter < 300) {
        const alpha = Math.max(0.05, 1 - iter / 250);
        physicsStep(nodesRef.current, edgesRef.current, size.w / 2, size.h / 2, alpha);
        iterRef.current++;
      }
      if (canvasRef.current) draw(canvasRef.current, nodesRef.current, edgesRef.current, stateRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  // Hit test
  const hitNode = useCallback((ex: number, ey: number): Node | null => {
    const { pan, zoom } = stateRef.current;
    const W = size.w, H = size.h;
    const wx = (ex - pan.x - W/2) / zoom + W/2;
    const wy = (ey - pan.y - H/2) / zoom + H/2;
    let best: Node | null = null, bestD = Infinity;
    for (const n of nodesRef.current) {
      const d = Math.sqrt((n.x-wx)**2 + (n.y-wy)**2);
      if (d < n.r + 8 && d < bestD) { bestD = d; best = n; }
    }
    return best;
  }, [size]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    const ex = e.clientX - rect.left, ey = e.clientY - rect.top;

    if (s.drag) {
      const { pan, zoom } = s;
      const W = size.w, H = size.h;
      const dx = e.clientX - s.drag.mx, dy = e.clientY - s.drag.my;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) s.dragMoved = true;
      const nx = (s.drag.ox - W/2) + dx / zoom;
      const ny = (s.drag.oy - H/2) + dy / zoom;
      const node = nodesRef.current.find(n => n.id === s.drag!.id);
      if (node) {
        node.x = nx + W/2;
        node.y = ny + H/2;
        node.vx = 0; node.vy = 0;
      }
      s.cursor = 'grabbing';
    } else if (s.panning && s.panStart) {
      s.pan = { x: s.panStart.px + e.clientX - s.panStart.mx, y: s.panStart.py + e.clientY - s.panStart.my };
      s.cursor = 'grabbing';
    } else {
      const hit = hitNode(ex, ey);
      s.hovered = hit?.id ?? null;
      s.cursor = hit ? 'pointer' : 'grab';
    }
    if (canvasRef.current) canvasRef.current.style.cursor = s.cursor;
  }, [hitNode, size]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const s = stateRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    const hit = hitNode(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      s.dragMoved = false;
      s.drag = { id: hit.id, ox: hit.x - size.w/2, oy: hit.y - size.h/2, mx: e.clientX, my: e.clientY };
    } else {
      s.panning = true;
      s.panStart = { mx: e.clientX, my: e.clientY, px: s.pan.x, py: s.pan.y };
    }
  }, [hitNode, size]);

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (s.drag) {
      if (!s.dragMoved) {
        // click
        const node = nodesRef.current.find(n => n.id === s.drag!.id);
        if (node?.type === 'goal' && node.goal) onSelect?.(node.goal);
      } else {
        savePos(nodesRef.current);
        iterRef.current = 280; // settle quickly after drag
      }
      s.drag = null;
    }
    s.panning = false; s.panStart = null;
    s.cursor = 'grab';
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  }, [onSelect]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const s = stateRef.current;
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    s.zoom = Math.max(0.8, Math.min(4, s.zoom * factor));
  }, []);

  const onMouseLeave = useCallback(() => {
    const s = stateRef.current;
    stateRef.current.hovered = null;
    if (s.drag) { savePos(nodesRef.current); s.drag = null; }
    s.panning = false; s.panStart = null;
  }, []);

  const onReset = useCallback(() => {
    localStorage.removeItem(POS_KEY);
    stateRef.current.pan = { x: 0, y: 0 };
    stateRef.current.zoom = 1.6;
    const { nodes, edges } = buildGraph(goals, spheres, size.w, size.h);
    nodesRef.current = nodes;
    edgesRef.current = edges;
    iterRef.current = 0;
  }, [goals, spheres, size]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#0d0c14', ...style }}
    >
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        style={{ display: 'block', cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onWheel={onWheel}
      />
      {/* Controls */}
      <div style={{
        position: 'absolute', bottom: 14, right: 16,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 11,
          color: 'rgba(255,255,255,0.22)', pointerEvents: 'none', userSelect: 'none',
        }}>
          scroll to zoom · drag to pan
        </span>
        <button
          onClick={onReset}
          title="Скинути розташування"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.45)',
            cursor: 'pointer', padding: 0,
            transition: 'background .15s, color .15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M11 6.5A4.5 4.5 0 1 1 6.5 2a4.5 4.5 0 0 1 3.18 1.32L11 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M11 2v3H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
