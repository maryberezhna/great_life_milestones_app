'use client';

import { useState } from 'react';
import { StatusChip } from './StatusChip';

type TaskStatus = 'active' | 'hold' | 'done' | 'overdue' | 'dropped';

interface TaskItemProps {
  title: string;
  subtitle?: string;
  deadline?: string;
  status?: TaskStatus;
  accent?: string;
  inCalendar?: boolean;
  onToggle?: () => void;
  onRollover?: () => void;
  onDrop?: () => void;
}

export function TaskItem({ title, subtitle, deadline, status = 'active', accent = 'hsl(var(--sphere-blue))', inCalendar = false, onToggle, onRollover, onDrop }: TaskItemProps) {
  const [hover, setHover] = useState(false);
  const done = status === 'done';
  const dropped = status === 'dropped';
  const overdue = status === 'overdue';

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 'var(--radius-md)',
        background: hover ? 'hsl(var(--surface-hover))' : 'transparent',
        transition: 'background var(--dur-fast) var(--ease-out)',
      }}
    >
      {/* Toggle circle */}
      <button
        type="button" onClick={onToggle}
        aria-label={done ? 'Скасувати' : 'Виконано'}
        style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: 999, cursor: 'pointer',
          border: done ? 'none' : '2px solid hsl(var(--border-strong))',
          background: done ? 'hsl(var(--success))' : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 13, padding: 0,
          transition: 'all var(--dur-fast) var(--ease-out)',
        }}
      >{done ? '✓' : ''}</button>

      {/* Body */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, lineHeight: 1.35,
          color: done || dropped ? 'hsl(var(--text-faint))' : 'hsl(var(--text-strong))',
          textDecoration: done || dropped ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 13, color: 'hsl(var(--text-muted))', marginTop: 2 }}>{subtitle}</div>
        )}
        {deadline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 12, color: overdue ? 'hsl(var(--overdue))' : 'hsl(var(--text-muted))' }}>
            <span>{deadline}</span>
            {inCalendar && <span style={{ color: accent }}>● у календарі</span>}
          </div>
        )}
      </div>

      {/* Trailing */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {hover && !done && !dropped ? (
          <>
            <MiniAction label="Перенести" onClick={onRollover} />
            <MiniAction label="Не актуально" muted onClick={onDrop} />
          </>
        ) : (
          status !== 'active' && <StatusChip status={status} size="sm" showDot={!overdue} />
        )}
      </div>
    </div>
  );
}

function MiniAction({ label, onClick, muted }: { label: string; onClick?: () => void; muted?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
        padding: '5px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        border: '1px solid ' + (h ? 'hsl(var(--border-strong))' : 'transparent'),
        background: h ? 'hsl(var(--surface-card))' : 'transparent',
        color: muted ? 'hsl(var(--text-muted))' : 'hsl(var(--text-body))',
        whiteSpace: 'nowrap',
      }}>{label}</button>
  );
}
