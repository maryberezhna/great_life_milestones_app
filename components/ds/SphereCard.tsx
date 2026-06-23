'use client';

import { useState } from 'react';
import { SphereDot } from './SphereDot';
import { ProgressBar } from './ProgressBar';

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

interface SphereCardProps {
  name: string;
  icon?: string;
  accent?: string;
  soft?: string;
  activeCount?: number;
  doneCount?: number;
  totalCount?: number;
  dormant?: boolean;
  onClick?: () => void;
}

export function SphereCard({ name, icon, accent = 'hsl(var(--sphere-sage))', soft = 'hsl(var(--sphere-sage-soft))', activeCount = 0, doneCount = 0, totalCount = 0, dormant: dormantProp, onClick }: SphereCardProps) {
  const dormant = dormantProp != null ? dormantProp : activeCount === 0;
  const [hover, setHover] = useState(false);
  const fill = dormant ? 'hsl(var(--sphere-dormant))' : accent;
  const countText = dormant
    ? 'Немає активних задач'
    : `${activeCount} ${plural(activeCount, 'активна ціль', 'активні цілі', 'активних цілей')}`;

  return (
    <div
      role="button" tabIndex={0} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: 'hsl(var(--surface-card))',
        border: '1px solid hsl(var(--border-subtle))',
        borderRadius: 'var(--radius-lg)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-1px)' : 'none',
        transition: 'box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
        padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 16,
        opacity: dormant ? 0.82 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SphereDot accent={accent} soft={soft} dormant={dormant} icon={icon} size={42} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 16, color: 'hsl(var(--text-strong))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, marginTop: 3, color: dormant ? 'hsl(var(--text-faint))' : 'hsl(var(--text-muted))' }}>
            {countText}
          </div>
        </div>
      </div>
      <ProgressBar value={doneCount} max={Math.max(totalCount, 1)} color={fill} height={5} showLabel={!dormant && totalCount > 0} done={doneCount} />
    </div>
  );
}
