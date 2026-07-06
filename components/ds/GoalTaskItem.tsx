'use client';

import { useState, useTransition, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateTaskStatus, updateTask } from '@/app/actions';

type DbStatus = 'active' | 'postponed' | 'done' | 'irrelevant';

// ── URL helpers ─────────────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s]+/g;

function parseSpecific(text: string) {
  const urls = text.match(URL_RE);
  const link = urls?.[0] ?? '';
  const clean = text.replace(URL_RE, '').replace(/\s{2,}/g, ' ').trim();
  return { clean: clean || text, link };
}

function linkLabel(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? '/…' : '');
  } catch { return url.slice(0, 40) + '…'; }
}

// ── Auto-resize textarea ─────────────────────────────────────────────────────

function AutoTA({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      autoFocus
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', border: 'none', outline: 'none', resize: 'none', overflow: 'hidden',
        background: 'transparent', padding: 0,
        fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500,
        color: 'hsl(var(--text-strong))', lineHeight: 1.45,
      }}
      onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px ${accent}44`; }}
      onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  id: string;
  goalId: string;
  specific: string;
  action?: string | null;
  deadline?: string | null;
  status: DbStatus;
  calendarEventId?: string | null;
  accent?: string;
}

export function GoalTaskItem({ id, goalId, specific, deadline, status, accent = 'hsl(var(--sphere-violet))' }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editLink, setEditLink] = useState('');
  const [hover, setHover]     = useState(false);
  const [, startT]            = useTransition();
  const router                = useRouter();

  const isDone    = status === 'done';
  const isHold    = status === 'postponed';
  const isDropped = status === 'irrelevant';
  const { clean, link } = parseSpecific(specific);

  function mutate(newStatus: DbStatus) {
    startT(async () => {
      await updateTaskStatus(id, newStatus, goalId);
      router.refresh();
    });
  }

  function startEdit() {
    const { clean: t, link: l } = parseSpecific(specific);
    setEditText(t);
    setEditLink(l);
    setEditing(true);
  }

  function saveEdit() {
    const newSpecific = (editText.trim() + (editLink.trim() ? ' ' + editLink.trim() : '')).trim();
    if (!newSpecific) { setEditing(false); return; }
    startT(async () => {
      await updateTask(id, goalId, { specific: newSpecific });
      router.refresh();
    });
    setEditing(false);
  }

  const fmtDeadline = deadline
    ? new Date(deadline).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
    : null;

  // ── Edit mode ──
  if (editing) {
    return (
      <div style={{
        padding: '12px 14px',
        background: `${accent}0d`,
        borderLeft: `3px solid ${accent}`,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <AutoTA value={editText} onChange={setEditText} accent={accent} />

        {/* Link field */}
        <input
          type="url"
          value={editLink}
          onChange={e => setEditLink(e.target.value)}
          placeholder="Посилання (необов'язково)"
          style={{
            width: '100%', border: '1px solid hsl(var(--border-subtle))',
            borderRadius: 6, padding: '5px 9px', fontSize: 12,
            fontFamily: 'var(--font-sans)', color: 'hsl(var(--text-muted))',
            background: 'hsl(var(--surface-sunken))', outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setEditing(false)}
            style={{
              padding: '5px 13px', borderRadius: 6,
              border: '1px solid hsl(var(--border-subtle))', background: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
              color: 'hsl(var(--text-muted))',
            }}
          >Скасувати</button>
          <button
            onClick={saveEdit}
            style={{
              padding: '5px 14px', borderRadius: 6, border: 'none',
              background: accent, color: '#fff',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >Зберегти</button>
        </div>
      </div>
    );
  }

  // ── Read mode ──
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px',
        background: hover ? 'hsl(var(--surface-hover))' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Toggle circle */}
      <button
        type="button"
        onClick={() => mutate(isDone ? 'active' : 'done')}
        aria-label={isDone ? 'Скасувати' : 'Виконано'}
        style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: 999,
          cursor: 'pointer', marginTop: 1,
          border: isDone ? 'none' : `2px solid ${isHold ? accent + '88' : 'hsl(var(--border-strong))'}`,
          background: isDone ? accent : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, padding: 0,
          transition: 'all 0.15s ease',
        }}
      >{isDone ? '✓' : ''}</button>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500,
          lineHeight: 1.4, wordBreak: 'break-word',
          color: isDone || isDropped ? 'hsl(var(--text-faint))' : 'hsl(var(--text-strong))',
          textDecoration: isDone || isDropped ? 'line-through' : 'none',
        }}>
          {clean}
        </div>

        {/* Link chip */}
        {link && !isDone && !isDropped && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 5, padding: '2px 8px', borderRadius: 20,
              background: `${accent}18`, color: accent,
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
              textDecoration: 'none', maxWidth: '100%', overflow: 'hidden',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
              <path d="M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5M6.5 1H10m0 0v3.5M10 1L5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {linkLabel(link)}
            </span>
          </a>
        )}

        {/* Deadline + status badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: link && !isDone ? 5 : 4, flexWrap: 'wrap' }}>
          {fmtDeadline && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'hsl(var(--text-muted))',
            }}>до {fmtDeadline}</span>
          )}
          {isHold && (
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
              color: accent, background: `${accent}18`,
              padding: '1px 7px', borderRadius: 20,
            }}>на паузі</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {hover && !isDone && !isDropped && (
          <>
            <ActionBtn label="✎" title="Редагувати" onClick={startEdit} accent={accent} />
            {!isHold && <ActionBtn label="⏸" title="На паузу" onClick={() => mutate('postponed')} />}
            {isHold  && <ActionBtn label="▶" title="Відновити" onClick={() => mutate('active')} accent={accent} />}
            <ActionBtn label="✕" title="Не актуально" onClick={() => mutate('irrelevant')} muted />
          </>
        )}
        {hover && (isDone || isDropped) && (
          <ActionBtn label="↩" title="Відновити" onClick={() => mutate('active')} />
        )}
      </div>
    </div>
  );
}

function ActionBtn({ label, title, onClick, accent, muted }: {
  label: string; title: string; onClick: () => void; accent?: string; muted?: boolean;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
        background: h ? (accent ? `${accent}18` : 'hsl(var(--surface-sunken))') : 'transparent',
        color: h ? (accent ?? (muted ? 'hsl(var(--text-faint))' : 'hsl(var(--text-body))')) : 'hsl(var(--text-muted))',
        transition: 'all 0.12s ease',
      }}
    >{label}</button>
  );
}
