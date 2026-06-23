'use client';

interface ProgressBarProps {
  value?: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  done?: number;
}

export function ProgressBar({ value = 0, max = 1, color = 'hsl(var(--primary))', height = 6, showLabel = false, done }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0)) * 100;
  const text = done != null ? `${done} з ${max}` : `${Math.round(pct)}%`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <div style={{ flex: 1, height, background: 'hsl(var(--surface-sunken))', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width var(--dur-slow) var(--ease-soft)' }} />
      </div>
      {showLabel && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>
          {text}
        </span>
      )}
    </div>
  );
}
