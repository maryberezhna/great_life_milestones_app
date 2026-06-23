'use client';

interface SphereDotProps {
  accent?: string;
  soft?: string;
  dormant?: boolean;
  icon?: string;
  size?: number;
}

export function SphereDot({ accent = 'hsl(var(--sphere-sage))', soft = 'hsl(var(--sphere-sage-soft))', dormant = false, icon, size = 40 }: SphereDotProps) {
  const fg = dormant ? 'hsl(var(--sphere-dormant))' : accent;
  const bg = dormant ? 'hsl(var(--sphere-dormant-soft))' : soft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: Math.round(size * 0.32),
      background: bg, color: fg, flexShrink: 0,
      fontSize: Math.round(size * 0.5), lineHeight: 1,
    }}>
      {icon || <span style={{ width: size * 0.28, height: size * 0.28, borderRadius: 999, background: fg }} />}
    </span>
  );
}
