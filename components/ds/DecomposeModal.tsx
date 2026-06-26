'use client';

import { useState, useTransition, useLayoutEffect, useRef } from 'react';
import { createTasks } from '@/app/actions/tasks';
import { decomposeWithAI } from '@/app/actions/decompose';
import type { ConstellationGoal, ConstellationSphere } from './GoalConstellation';

type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

const RECURRENCE_OPTIONS: { value: Recurrence; label: string; rrule: string }[] = [
  { value: 'none',     label: 'Одноразово',  rrule: '' },
  { value: 'daily',    label: 'Щодня',       rrule: 'RRULE:FREQ=DAILY' },
  { value: 'weekdays', label: 'По будніх',   rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { value: 'weekly',   label: 'Щотижня',     rrule: 'RRULE:FREQ=WEEKLY' },
  { value: 'monthly',  label: 'Щомісяця',    rrule: 'RRULE:FREQ=MONTHLY' },
];

interface TaskDraft {
  id: string;
  specific: string;
  deadline: string;
  reminder: boolean;
  calendar: boolean;
  calendarTime: string;
  recurrence: Recurrence;
}

type Step = 1 | 2 | 3;

interface Props {
  goal: ConstellationGoal;
  spheres: ConstellationSphere[];
  onClose: () => void;
}

function mkDraft(specific = '', deadline = ''): TaskDraft {
  return { id: Math.random().toString(36).slice(2), specific, deadline, reminder: false, calendar: false, calendarTime: '09:00', recurrence: 'weekly' };
}

function AutoTextarea({ value, onChange, placeholder, style, className }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
}) {
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
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={2}
      style={{ ...style, resize: 'none', overflow: 'hidden' }}
    />
  );
}

function pluralKrok(n: number) {
  if (n === 1) return '1 крок';
  if (n <= 4) return `${n} кроки`;
  return `${n} кроків`;
}

function gCalUrl(title: string, date: string, time: string, goalTitle: string, recurrence: Recurrence) {
  const [h, m] = time.split(':').map(Number);
  const endH = String((h + 1) % 24).padStart(2, '0');
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = date.replace(/-/g, '') + 'T' + pad(h) + pad(m) + '00';
  const end   = date.replace(/-/g, '') + 'T' + endH + pad(m) + '00';
  const rrule = RECURRENCE_OPTIONS.find(r => r.value === recurrence)?.rrule ?? '';
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(title) +
    '&dates=' + start + '/' + end +
    '&details=' + encodeURIComponent('Крок до цілі: ' + goalTitle) +
    (rrule ? '&recur=' + encodeURIComponent(rrule) : '')
  );
}

async function scheduleNotification(title: string, deadline: string) {
  if (!('Notification' in window)) return;
  await Notification.requestPermission();
  if (Notification.permission !== 'granted') return;
  const ms = new Date(deadline + 'T09:00').getTime() - Date.now();
  if (ms > 0 && ms < 2_147_483_647) {
    setTimeout(() => new Notification('Нагадування', { body: title, icon: '/favicon.ico' }), ms);
  }
}

export function DecomposeModal({ goal, spheres, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [tasks, setTasks] = useState<TaskDraft[]>([mkDraft()]);
  const [aiError, setAiError] = useState<string | null>(null);

  const [isAiPending, startAiTransition] = useTransition();
  const [isSavePending, startSaveTransition] = useTransition();

  const sp   = spheres.find(s => s.key === goal.sphere);
  const col  = `hsl(var(--sphere-${goal.sphere}))`;
  const soft = `hsl(var(--sphere-${goal.sphere}-soft))`;

  function update(id: string, patch: Partial<TaskDraft>) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  }

  const valid = tasks.filter(t => t.specific.trim());
  const canSave = valid.length > 0;

  function handleManual() {
    setTasks([mkDraft()]);
    setAiError(null);
    setStep(2);
  }

  function handleAI() {
    setAiError(null);
    const today = new Date().toISOString().slice(0, 10);
    startAiTransition(async () => {
      try {
        const steps = await decomposeWithAI(goal.title ?? '', sp?.name ?? '', today);
        setTasks(steps.map(s => mkDraft(s.specific, s.deadline)));
        setStep(2);
      } catch (e) {
        console.error('[DecomposeModal] AI error:', e);
        setAiError('Не вдалося згенерувати кроки. Спробуй ще або сплануй сам.');
      }
    });
  }

  function handleSave() {
    startSaveTransition(async () => {
      await createTasks(goal.id ?? '', valid.map(t => ({
        specific: t.specific.trim(),
        deadline: t.deadline || undefined,
        recurrence: t.recurrence,
      })));
      // remind for: manual reminder toggle OR recurring tasks with a deadline
      for (const t of valid.filter(t => (t.reminder || t.recurrence !== 'none') && t.deadline)) {
        await scheduleNotification(t.specific.trim(), t.deadline);
      }
      setStep(3);
    });
  }

  const INPUT: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid hsl(var(--border-field))',
    background: 'hsl(var(--surface-sunken))',
    fontFamily: 'var(--font-sans)', fontSize: 14,
    color: 'hsl(var(--text-strong))', outline: 'none', boxSizing: 'border-box',
  };

  const LABEL: React.CSSProperties = {
    display: 'block', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600,
    color: 'hsl(var(--text-muted))', marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <>
      <style>{`
        @keyframes ds-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes ds-modal { from { transform:translate(-50%,-47%) scale(.96); opacity:0 } to { transform:translate(-50%,-50%) scale(1); opacity:1 } }
        @keyframes ds-spin  { to { transform: rotate(360deg); } }
        .ds-ai-btn:hover:not(:disabled) { opacity:.88; }
        .ds-pill-btn { transition: background .15s, border-color .15s, color .15s; }
        .ds-pill-btn:hover { filter: brightness(.96); }
        .ds-input:focus { border-color: ${col} !important; box-shadow: 0 0 0 3px hsl(var(--sphere-${goal.sphere}) / .14); }
        .ds-inline-ta::placeholder { color: #C7C7CC; }
        .ds-inline-ta:focus { outline: none; }
        .ds-date-input::-webkit-calendar-picker-indicator { opacity: 0; width: 0; }
        .ds-step-row .ds-delete { opacity: 0; transition: opacity .15s; }
        .ds-step-row:hover .ds-delete { opacity: 1; }
        .ds-toggle-btn { transition: color .12s; }
        .ds-toggle-btn:hover { opacity: .8; }
        .ds-recur-btn { transition: background .12s, color .12s; }
        .ds-recur-btn:hover { filter: brightness(.96); }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'hsl(28 16% 10% / .52)',
        backdropFilter: 'blur(5px)',
        animation: 'ds-fade .2s ease',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 61, width: 'calc(100% - 32px)', maxWidth: 540, maxHeight: '92vh',
        background: 'hsl(var(--surface-card))',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'ds-modal .3s cubic-bezier(.32,.9,.3,1)',
      }}>

        {/* ── Stepper header ── */}
        <div style={{ padding: '22px 26px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {(['Ціль', 'Кроки', 'Готово'] as const).map((label, i) => {
                const n = (i + 1) as Step;
                const active = step === n;
                const done   = step > n;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && <div style={{ width: 30, height: 1.5, background: done ? col : 'hsl(var(--border-subtle))', transition: 'background .3s' }} />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: i < 2 ? 4 : 0 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 999, flexShrink: 0,
                        background: (done || active) ? col : 'hsl(var(--surface-sunken))',
                        border: `1.5px solid ${(done || active) ? col : 'hsl(var(--border-subtle))'}`,
                        color: (done || active) ? '#fff' : 'hsl(var(--text-faint))',
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .3s',
                      }}>
                        {done ? '✓' : n}
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: 'var(--font-sans)',
                        color: active ? 'hsl(var(--text-strong))' : done ? col : 'hsl(var(--text-faint))',
                        transition: 'color .3s',
                      }}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: 'hsl(var(--surface-sunken))', color: 'hsl(var(--text-muted))',
              fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>

          {/* Sphere chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 16,
            padding: '5px 11px 5px 8px', borderRadius: 'var(--radius-pill)', background: soft,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: col, flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{sp?.icon as string}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: col, fontFamily: 'var(--font-sans)' }}>{sp?.name}</span>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 26px' }}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div style={{ paddingBottom: 28 }}>
              <h2 style={{
                fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 22,
                color: 'hsl(var(--text-strong))', letterSpacing: '-0.025em',
                lineHeight: 1.2, marginBottom: 6,
              }}>
                {goal.title}
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'hsl(var(--text-muted))', lineHeight: 1.55, marginBottom: 28 }}>
                Як хочеш розбити цю ціль?
              </p>

              {/* AI button */}
              <button
                className="ds-ai-btn"
                onClick={handleAI}
                disabled={isAiPending}
                style={{
                  width: '100%', padding: '18px 22px', borderRadius: 'var(--radius-xl)',
                  background: col, color: '#fff', border: 'none',
                  cursor: isAiPending ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  boxShadow: `0 6px 20px hsl(var(--sphere-${goal.sphere}) / .34)`,
                  transition: 'opacity .15s',
                  marginBottom: 14,
                  opacity: isAiPending ? .8 : 1,
                }}
              >
                {isAiPending ? (
                  <span style={{
                    width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: 18,
                  }}>
                    <span style={{ display: 'inline-block', animation: 'ds-spin 1s linear infinite' }}>⟳</span>
                  </span>
                ) : (
                  <span style={{
                    width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: 18,
                  }}>✦</span>
                )}
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
                    {isAiPending ? 'Генерую кроки…' : 'Розпланувати з AI'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 13.5, opacity: .85, marginTop: 3 }}>
                    {isAiPending ? 'Це займе кілька секунд' : 'Claude підбере 3–5 SMART-кроків за тебе'}
                  </div>
                </div>
              </button>

              {/* Error */}
              {aiError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 12,
                  background: 'hsl(var(--overdue-soft))', color: 'hsl(var(--overdue))',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5,
                }}>
                  {aiError}
                </div>
              )}

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 14px' }}>
                <div style={{ flex: 1, height: 1, background: 'hsl(var(--border-subtle))' }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'hsl(var(--text-faint))', fontWeight: 500 }}>або</span>
                <div style={{ flex: 1, height: 1, background: 'hsl(var(--border-subtle))' }} />
              </div>

              {/* Manual button */}
              <button
                onClick={handleManual}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 'var(--radius-xl)',
                  background: 'transparent', border: '1.5px solid hsl(var(--border-subtle))',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'border-color .15s, background .15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = col; (e.currentTarget as HTMLButtonElement).style.background = soft; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(var(--border-subtle))'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'hsl(var(--text-strong))' }}>
                    Планую сам
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'hsl(var(--text-muted))', marginTop: 2 }}>
                    Додай кроки вручну — мінімум один
                  </div>
                </div>
                <span style={{ fontSize: 18, color: 'hsl(var(--text-muted))' }}>→</span>
              </button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div style={{ paddingBottom: 28 }}>
              {/* Title + subtitle */}
              <h2 style={{
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 22,
                color: 'hsl(var(--text-strong))', letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 4,
              }}>
                {goal.title}
              </h2>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 14, color: '#8E8E93', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {valid.length} {valid.length === 1 ? 'крок' : valid.length < 5 ? 'кроки' : 'кроків'} додано
              </p>

              {/* Apple-style grouped list */}
              <div style={{
                background: 'hsl(var(--surface-card))',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 1px 0 rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.04)',
              }}>
                {tasks.map((t, idx) => (
                  <div key={t.id} className="ds-step-row" style={{
                    display: 'flex', gap: 0,
                    borderBottom: idx < tasks.length - 1 ? '1px solid rgba(60,60,67,.1)' : 'none',
                  }}>
                    {/* Left: number */}
                    <div style={{
                      flexShrink: 0, width: 52,
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                      paddingTop: 18,
                    }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                        background: t.specific.trim() ? col : `${col}22`,
                        color: t.specific.trim() ? '#fff' : col,
                        fontFamily: '-apple-system, var(--font-sans)', fontWeight: 700, fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .25s cubic-bezier(.32,.9,.3,1)',
                        letterSpacing: '-0.01em',
                      }}>{idx + 1}</span>
                    </div>

                    {/* Center: content */}
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 16, paddingBottom: 14, paddingRight: 4 }}>
                      {/* Task text */}
                      <AutoTextarea
                        className="ds-inline-ta"
                        value={t.specific}
                        onChange={e => update(t.id, { specific: e.target.value })}
                        placeholder="Що конкретно зробити?"
                        style={{
                          width: '100%', border: 'none', outline: 'none',
                          background: 'transparent', padding: 0,
                          fontFamily: '-apple-system, var(--font-sans)',
                          fontSize: 16, fontWeight: 500,
                          color: 'hsl(var(--text-strong))', lineHeight: 1.45,
                        }}
                      />

                      {/* Meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                        {/* Date — tappable, opens native picker */}
                        <label style={{ position: 'relative', cursor: 'pointer' }}>
                          <span style={{
                            fontFamily: '-apple-system, var(--font-mono)', fontSize: 13,
                            fontWeight: 500, letterSpacing: '0.01em',
                            color: t.deadline ? col : '#C7C7CC',
                          }}>
                            {t.deadline
                              ? new Date(t.deadline + 'T12:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '+ Дедлайн'}
                          </span>
                          <input
                            className="ds-date-input"
                            type="date"
                            value={t.deadline}
                            onChange={e => update(t.id, { deadline: e.target.value })}
                            min={new Date().toISOString().slice(0, 10)}
                            style={{
                              position: 'absolute', inset: 0, opacity: 0,
                              width: '100%', cursor: 'pointer',
                            }}
                          />
                        </label>

                        {t.deadline && <>
                          <span style={{ color: 'rgba(60,60,67,.18)', fontSize: 14 }}>|</span>

                          {/* Reminder toggle */}
                          <button
                            className="ds-toggle-btn"
                            onClick={() => update(t.id, { reminder: !t.reminder })}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                              fontFamily: '-apple-system, var(--font-sans)', fontSize: 13, fontWeight: 500,
                              color: t.reminder ? col : '#8E8E93',
                            }}
                          >
                            🔔
                          </button>

                          {/* Calendar toggle */}
                          <button
                            className="ds-toggle-btn"
                            onClick={() => update(t.id, { calendar: !t.calendar, recurrence: 'none' })}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                              fontFamily: '-apple-system, var(--font-sans)', fontSize: 13, fontWeight: 500,
                              color: t.calendar ? col : '#8E8E93',
                            }}
                          >
                            📅 {t.calendar ? 'Додано' : 'Календар'}
                          </button>
                        </>}
                      </div>

                      {/* Calendar expanded: time + recurrence */}
                      {t.calendar && t.deadline && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: '-apple-system, var(--font-sans)', fontSize: 13, color: '#8E8E93' }}>Час:</span>
                            <input
                              type="time"
                              value={t.calendarTime}
                              onChange={e => update(t.id, { calendarTime: e.target.value })}
                              style={{
                                fontFamily: '-apple-system, var(--font-mono)', fontSize: 13,
                                border: `1px solid ${col}44`, borderRadius: 8,
                                padding: '3px 8px', background: soft, color: col,
                                outline: 'none', cursor: 'pointer',
                              }}
                            />
                          </div>
                          {/* Recurrence — segmented control style */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {RECURRENCE_OPTIONS.map(opt => {
                              const on = t.recurrence === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  className="ds-recur-btn"
                                  onClick={() => update(t.id, { recurrence: opt.value, reminder: opt.value !== 'none' ? true : t.reminder })}
                                  style={{
                                    padding: '4px 11px', borderRadius: 8,
                                    border: `1px solid ${on ? col : 'rgba(60,60,67,.18)'}`,
                                    background: on ? col : 'transparent',
                                    color: on ? '#fff' : '#3C3C43',
                                    cursor: 'pointer',
                                    fontFamily: '-apple-system, var(--font-sans)',
                                    fontSize: 12, fontWeight: 500,
                                  }}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: delete */}
                    <div style={{ flexShrink: 0, width: 44, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 18 }}>
                      <button
                        className="ds-delete"
                        onClick={() => tasks.length > 1 && setTasks(ts => ts.filter(x => x.id !== t.id))}
                        disabled={tasks.length === 1}
                        title="Видалити"
                        style={{
                          background: 'none', border: 'none',
                          cursor: tasks.length > 1 ? 'pointer' : 'default',
                          color: '#FF3B30', fontSize: 13, lineHeight: 1,
                          width: 26, height: 26, borderRadius: 999,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M1 3.5h12M4.5 3.5V2.5a1 1 0 011-1h3a1 1 0 011 1v1M5.5 6.5v4M8.5 6.5v4M2.5 3.5l.75 7.5a1 1 0 001 .75h5.5a1 1 0 001-.75l.75-7.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add row — inside the group */}
                {tasks.length < 5 && (
                  <button
                    onClick={() => setTasks(ts => [...ts, mkDraft()])}
                    style={{
                      width: '100%', padding: '15px 16px 15px 52px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontFamily: '-apple-system, var(--font-sans)', fontSize: 15, fontWeight: 400,
                      color: col,
                      textAlign: 'left',
                      borderTop: tasks.length > 0 ? '1px solid rgba(60,60,67,.1)' : 'none',
                    }}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: 999,
                      background: `${col}18`, color: col,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, lineHeight: 1, fontWeight: 400, flexShrink: 0,
                    }}>+</span>
                    Новий крок
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div style={{ paddingBottom: 28 }}>
              <div style={{ textAlign: 'center', padding: '16px 0 22px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 999, background: soft, color: col,
                  fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>✓</div>
                <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 22, color: 'hsl(var(--text-strong))', letterSpacing: '-0.025em' }}>
                  Кроки збережено!
                </h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'hsl(var(--text-muted))', marginTop: 5 }}>
                  {pluralKrok(valid.length)} до цілі «{goal.title}»
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {valid.map((t, i) => (
                  <div key={t.id} style={{
                    padding: '13px 15px', borderRadius: 'var(--radius-md)',
                    background: 'hsl(var(--surface-sunken))',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 999, background: col, color: '#fff', flexShrink: 0,
                      fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, marginTop: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'hsl(var(--text-strong))' }}>
                        {t.specific}
                      </div>
                      {t.deadline && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 3 }}>
                          до {new Date(t.deadline + 'T12:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
                        </div>
                      )}
                      {(t.reminder || (t.calendar && t.deadline)) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                          {t.reminder && (
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: col, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              🔔 нагадування заплановано
                            </span>
                          )}
                          {t.calendar && t.deadline && (
                            <a
                              href={gCalUrl(t.specific, t.deadline, t.calendarTime, goal.title ?? '', t.recurrence)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontFamily: 'var(--font-sans)', fontSize: 12.5, color: col,
                                fontWeight: 600, textDecoration: 'none',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                              }}
                            >
                              📅 {t.recurrence !== 'none'
                                ? `Додати як повторювану подію (${RECURRENCE_OPTIONS.find(r => r.value === t.recurrence)?.label?.toLowerCase()}) →`
                                : 'Додати в Google Calendar →'}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 26px 22px', flexShrink: 0,
          borderTop: '1px solid hsl(var(--border-subtle))',
          display: 'flex', justifyContent: step === 3 ? 'stretch' : 'space-between',
          alignItems: 'center',
          background: 'hsl(var(--surface-card))',
        }}>
          {step === 1 && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--text-muted))',
            }}>
              Скасувати
            </button>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--text-muted))' }}>
                ← Назад
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || isSavePending}
                style={{
                  padding: '12px 24px', borderRadius: 'var(--radius-md)', border: 'none',
                  cursor: canSave && !isSavePending ? 'pointer' : 'not-allowed',
                  background: canSave ? col : 'hsl(var(--border-subtle))',
                  color: canSave ? '#fff' : 'hsl(var(--text-faint))',
                  fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15,
                  display: 'flex', alignItems: 'center', gap: 7,
                  boxShadow: canSave ? `0 4px 14px hsl(var(--sphere-${goal.sphere}) / .32)` : 'none',
                  transition: 'background .2s, box-shadow .2s',
                }}
              >
                {isSavePending ? 'Зберігаємо…' : `Зберегти ${canSave ? pluralKrok(valid.length) : 'кроки'} →`}
              </button>
            </>
          )}

          {step === 3 && (
            <button onClick={onClose} style={{
              flex: 1, padding: '13px', borderRadius: 'var(--radius-md)',
              background: col, color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15,
              boxShadow: `0 4px 14px hsl(var(--sphere-${goal.sphere}) / .32)`,
            }}>
              Готово
            </button>
          )}
        </div>
      </div>
    </>
  );
}
