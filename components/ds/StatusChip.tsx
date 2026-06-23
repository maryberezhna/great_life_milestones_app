'use client';

type StatusKey = 'active' | 'hold' | 'done' | 'overdue' | 'dropped';

const STATUS: Record<StatusKey, { soft: string; fg: string; dot: string; label: string }> = {
  active:  { soft: 'var(--primary-soft)',  fg: 'var(--primary-hover)', dot: 'var(--primary)',    label: 'Активна' },
  hold:    { soft: 'var(--hold-soft)',     fg: 'var(--text-muted)',    dot: 'var(--hold)',       label: 'На паузі' },
  done:    { soft: 'var(--success-soft)',  fg: 'var(--success)',       dot: 'var(--success)',    label: 'Готово' },
  overdue: { soft: 'var(--overdue-soft)',  fg: 'var(--overdue)',       dot: 'var(--overdue)',    label: 'Перепланувати' },
  dropped: { soft: 'var(--hold-soft)',     fg: 'var(--text-faint)',    dot: 'var(--text-faint)', label: 'Не актуально' },
};

interface StatusChipProps {
  status?: StatusKey;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

export function StatusChip({ status = 'active', label, showDot = true, size = 'md' }: StatusChipProps) {
  const s = STATUS[status] ?? STATUS.active;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: size === 'sm' ? '4px 9px' : '6px 12px',
      borderRadius: 'var(--radius-pill)',
      background: `hsl(${s.soft})`, color: `hsl(${s.fg})`,
      fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? 12 : 13, fontWeight: 500, lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      {showDot && status !== 'dropped' && (
        <span style={{ width: 7, height: 7, borderRadius: 999, background: `hsl(${s.dot})` }} />
      )}
      {status === 'done' && <span aria-hidden style={{ marginRight: -2 }}>✓</span>}
      {label ?? s.label}
    </span>
  );
}
