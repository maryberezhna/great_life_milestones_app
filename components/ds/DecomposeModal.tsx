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
  return { id: Math.random().toString(36).slice(2), specific, deadline, reminder: false, calendar: false, calendarTime: '09:00', recurrence: 'none' };
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
      } catch {
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
        .ds-add-btn:hover { background: hsl(var(--surface-sunken)) !important; }
        .ds-input:focus { border-color: ${col} !important; box-shadow: 0 0 0 3px hsl(var(--sphere-${goal.sphere}) / .14); }
        .ds-inline-ta::placeholder { color: hsl(var(--text-faint)); }
        .ds-inline-ta:focus { outline: none; }
        .ds-date-input::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
        .ds-date-input:hover::-webkit-calendar-picker-indicator { opacity: 0.8; }
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
              <h2 style={{
                fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 20,
                color: 'hsl(var(--text-strong))', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 4,
              }}>
                {goal.title}
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--text-muted))', marginBottom: 22 }}>
                Перевір або відредагуй кроки — кожен із дедлайном.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tasks.map((t, idx) => (
                  <div key={t.id} style={{
                    display: 'flex', gap: 13,
                    padding: '16px 0',
                    borderBottom: idx < tasks.length - 1
                      ? '1px solid hsl(var(--border-subtle) / .55)'
                      : 'none',
                  }}>
                    {/* Step number */}
                    <div style={{ flexShrink: 0, paddingTop: 2 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 999, flexShrink: 0,
                        background: t.specific.trim() ? col : 'hsl(var(--surface-sunken))',
                        border: `1.5px solid ${t.specific.trim() ? col : 'hsl(var(--border-subtle))'}`,
                        color: t.specific.trim() ? '#fff' : 'hsl(var(--text-faint))',
                        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .2s',
                      }}>{idx + 1}</span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Borderless textarea */}
                      <AutoTextarea
                        className="ds-inline-ta"
                        value={t.specific}
                        onChange={e => update(t.id, { specific: e.target.value })}
                        placeholder="Що конкретно зробити?"
                        style={{
                          width: '100%', border: 'none', outline: 'none',
                          background: 'transparent', padding: 0,
                          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500,
                          color: 'hsl(var(--text-strong))', lineHeight: 1.5,
                        }}
                      />

                      {/* Compact meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                        {/* Date */}
                        <input
                          className="ds-date-input"
                          type="date"
                          value={t.deadline}
                          onChange={e => update(t.id, { deadline: e.target.value })}
                          min={new Date().toISOString().slice(0, 10)}
                          style={{
                            border: 'none', outline: 'none', background: 'transparent', padding: 0,
                            fontFamily: 'var(--font-mono)', fontSize: 12.5, cursor: 'pointer',
                            color: t.deadline ? col : 'hsl(var(--text-faint))',
                          }}
                        />

                        <span style={{ color: 'hsl(var(--border-subtle))', lineHeight: 1 }}>·</span>

                        {/* Reminder toggle */}
                        <button
                          className="ds-pill-btn"
                          onClick={() => update(t.id, { reminder: !t.reminder })}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 9px', borderRadius: 'var(--radius-pill)',
                            border: `1.5px solid ${t.reminder || t.recurrence !== 'none' ? col : 'hsl(var(--border-subtle))'}`,
                            background: t.reminder || t.recurrence !== 'none' ? soft : 'transparent',
                            color: t.reminder || t.recurrence !== 'none' ? col : 'hsl(var(--text-muted))',
                            cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          🔔 Нагадування
                        </button>

                        {/* Calendar toggle */}
                        <button
                          className="ds-pill-btn"
                          onClick={() => update(t.id, { calendar: !t.calendar, recurrence: 'none' })}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 9px', borderRadius: 'var(--radius-pill)',
                            border: `1.5px solid ${t.calendar ? col : 'hsl(var(--border-subtle))'}`,
                            background: t.calendar ? soft : 'transparent',
                            color: t.calendar ? col : 'hsl(var(--text-muted))',
                            cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          📅 Час у календарі
                          {t.calendar && t.deadline && (
                            <span style={{ opacity: .7, fontWeight: 400 }}>{t.calendarTime}</span>
                          )}
                        </button>
                      </div>

                      {/* Calendar time + recurrence — inline, only when calendar on */}
                      {t.calendar && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {t.deadline && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'hsl(var(--text-muted))' }}>Час:</span>
                              <input
                                className="ds-input"
                                type="time"
                                value={t.calendarTime}
                                onChange={e => update(t.id, { calendarTime: e.target.value })}
                                style={{ ...INPUT, width: 'auto', fontSize: 12, padding: '4px 8px' }}
                              />
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'hsl(var(--text-muted))' }}>Повторення:</span>
                            {RECURRENCE_OPTIONS.map(opt => {
                              const on = t.recurrence === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  className="ds-pill-btn"
                                  onClick={() => update(t.id, { recurrence: opt.value, reminder: opt.value !== 'none' ? true : t.reminder })}
                                  style={{
                                    padding: '3px 9px', borderRadius: 'var(--radius-pill)',
                                    border: `1.5px solid ${on ? col : 'hsl(var(--border-subtle))'}`,
                                    background: on ? col : 'transparent',
                                    color: on ? '#fff' : 'hsl(var(--text-body))',
                                    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
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

                    {/* Delete */}
                    {tasks.length > 1 && (
                      <button
                        onClick={() => setTasks(ts => ts.filter(x => x.id !== t.id))}
                        style={{
                          flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                          color: 'hsl(var(--text-faint))', fontSize: 15, lineHeight: 1,
                          paddingTop: 3, alignSelf: 'flex-start',
                          transition: 'color .15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--text-muted))')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--text-faint))')}
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>

              {tasks.length < 5 && (
                <button
                  className="ds-add-btn"
                  onClick={() => setTasks(ts => [...ts, mkDraft()])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginTop: 8, padding: '12px 0',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
                    color: 'hsl(var(--text-faint))',
                    transition: 'color .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--text-muted))')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--text-faint))')}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: '1.5px dashed hsl(var(--border-subtle))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, lineHeight: 1,
                  }}>+</span>
                  Додати крок
                </button>
              )}
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
