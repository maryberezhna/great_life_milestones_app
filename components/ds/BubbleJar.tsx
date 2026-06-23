'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Goal {
  id: string;
  title: string;
  target_date: string | null;
}

interface BubbleJarProps {
  sphereId: string;
  name: string;
  icon: string;
  sphereKey: string; // 'violet' | 'amber' | 'sage' | 'rose' | 'blue'
  goals: Goal[];
}

// Complexity → bubble diameter (px)
function bubbleSize(title: string): number {
  if (title.length > 28) return 128;
  if (title.length > 18) return 104;
  return 82;
}

function Bubble({ goal, sphereKey }: { goal: Goal; sphereKey: string }) {
  const [hover, setHover] = useState(false);
  const size = bubbleSize(goal.title);
  const accent = `hsl(var(--sphere-${sphereKey}))`;
  const soft = `hsl(var(--sphere-${sphereKey}-soft))`;
  // inner text box = ~68% of diameter so text stays inside the circle
  const innerW = Math.round(size * 0.68);

  return (
    <Link href={`/goals/${goal.id}`} style={{ textDecoration: 'none', flexShrink: 0 }} title={goal.title}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: hover ? accent : soft,
          border: `2px solid ${accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          transform: hover ? 'translateY(-5px) scale(1.05)' : 'none',
          boxShadow: hover
            ? `0 10px 28px color-mix(in srgb, ${accent} 38%, transparent)`
            : `0 2px 8px color-mix(in srgb, ${accent} 12%, transparent)`,
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

export function BubbleJar({ sphereId, name, icon, sphereKey, goals }: BubbleJarProps) {
  const accent = `hsl(var(--sphere-${sphereKey}))`;

  return (
    <div>
      {/* Sphere label */}
      <Link href={`/spheres/${sphereId}`} style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
          <span style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: `hsl(var(--sphere-${sphereKey}-soft))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>{icon}</span>
          <span style={{
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 12,
            color: 'hsl(var(--text-strong))', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>{name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'hsl(var(--text-faint))' }}>
            {goals.length}
          </span>
        </div>
      </Link>

      {/* The jar */}
      <div style={{
        minHeight: 160,
        borderRadius: 20,
        border: `1.5px solid hsl(var(--sphere-${sphereKey}) / 0.22)`,
        background: `hsl(var(--sphere-${sphereKey}-soft) / 0.55)`,
        padding: '18px 16px 22px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'flex-end',
      }}>
        {goals.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 13, color: accent,
            opacity: 0.5, margin: 'auto', paddingBottom: 8,
          }}>
            + додати ціль
          </div>
        ) : goals.map(g => (
          <Bubble key={g.id} goal={g} sphereKey={sphereKey} />
        ))}
      </div>
    </div>
  );
}
