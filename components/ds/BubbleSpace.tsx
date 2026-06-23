'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Goal {
  id: string;
  title: string;
  target_date: string | null;
  sphereKey: string;
  sphereName: string;
  sphereIcon: string;
}

function bubbleSize(title: string): number {
  if (title.length > 28) return 130;
  if (title.length > 18) return 106;
  return 84;
}

// Simple deterministic pseudo-random from string
function seededRand(seed: string, i: number): number {
  let h = 0;
  for (let j = 0; j < seed.length; j++) h = (Math.imul(31, h) + seed.charCodeAt(j)) | 0;
  h = (h ^ (h >>> 16)) * 0x45d9f3b;
  h = (h ^ (h >>> 16)) * (i + 1) * 0x45d9f3b;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0xffffffff;
}

function Bubble({ goal, style }: { goal: Goal; style: React.CSSProperties }) {
  const [hover, setHover] = useState(false);
  const size = bubbleSize(goal.title);
  const accent = `hsl(var(--sphere-${goal.sphereKey}))`;
  const soft = `hsl(var(--sphere-${goal.sphereKey}-soft))`;
  const innerW = Math.round(size * 0.7);

  return (
    <Link
      href={`/goals/${goal.id}`}
      title={goal.title}
      style={{ textDecoration: 'none', position: 'absolute', ...style }}
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: hover ? accent : soft,
          border: `2px solid ${accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
          transform: hover ? 'translateY(-6px) scale(1.06)' : 'none',
          boxShadow: hover
            ? `0 12px 32px color-mix(in srgb, ${accent} 40%, transparent)`
            : `0 2px 10px color-mix(in srgb, ${accent} 16%, transparent)`,
        }}
      >
        <span style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
          width: innerW,
          fontFamily: 'var(--font-sans)',
          fontSize: size >= 120 ? 13 : size >= 100 ? 12 : 11,
          fontWeight: 600,
          lineHeight: 1.3,
          color: hover ? 'white' : accent,
          textAlign: 'center',
          wordBreak: 'break-word',
          hyphens: 'auto',
          userSelect: 'none',
        }}>
          {goal.title}
        </span>
      </div>
    </Link>
  );
}

function layoutBubbles(goals: Goal[], width: number, height: number) {
  const placed: { x: number; y: number; r: number; id: string }[] = [];

  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    const r = bubbleSize(g.title) / 2;
    const padding = 20;

    let bestX = padding + r;
    let bestY = padding + r;
    let found = false;

    // Try up to 200 random positions, pick the one that fits and is highest
    for (let attempt = 0; attempt < 300; attempt++) {
      const rx = seededRand(g.id, attempt * 2);
      const ry = seededRand(g.id, attempt * 2 + 1);
      const cx = padding + r + rx * (width - 2 * padding - 2 * r);
      const cy = padding + r + ry * (height - 2 * padding - 2 * r);

      // Check no overlap with placed bubbles
      let ok = true;
      for (const p of placed) {
        const dx = cx - p.x, dy = cy - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < r + p.r + 8) { ok = false; break; }
      }

      if (ok) {
        // Pick the position closest to top-left (natural reading order)
        if (!found || cy < bestY || (Math.abs(cy - bestY) < 20 && cx < bestX)) {
          bestX = cx; bestY = cy; found = true;
        }
      }
    }

    placed.push({ x: bestX, y: bestY, r, id: g.id });
  }

  return placed;
}

export function BubbleSpace({ goals }: { goals: Goal[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Sort: largest first so they get placed first (less likely to be pushed out)
  const sorted = [...goals].sort((a, b) => bubbleSize(b.title) - bubbleSize(a.title));
  const positions = dims.w > 0 ? layoutBubbles(sorted, dims.w, dims.h) : [];
  const posMap = Object.fromEntries(positions.map(p => [p.id, p]));

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {dims.w > 0 && sorted.map(g => {
        const pos = posMap[g.id];
        if (!pos) return null;
        const size = bubbleSize(g.title);
        return (
          <Bubble
            key={g.id}
            goal={g}
            style={{
              left: pos.x - size / 2,
              top: pos.y - size / 2,
            }}
          />
        );
      })}
    </div>
  );
}
