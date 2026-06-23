'use client';

import { useState, useTransition, useLayoutEffect, useRef } from 'react';
import type { Dream } from '@/app/actions/dreams';
import type { SphereOption } from '@/app/actions/goals';
import { createGoalFromDream } from '@/app/actions/goals';
import { createTasks } from '@/app/actions/tasks';
import { decomposeWithAI } from '@/app/actions/decompose';

type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

interface TaskDraft {
  id: string;
  specific: string;
  deadline: string;
  recurrence: Recurrence;
}

type Step = 1 | 2 | 3;

interface Props {
  dream: Dream;
  spheres: SphereOption[];
  onClose: () => void;
  onPromoted: (dreamId: string) => void;
}

function mkDraft(specific = '', deadline = ''): TaskDraft {
  return { id: Math.random().toString(36).slice(2), specific, deadline, recurrence: 'none' };
}

function AutoTextarea({ value, onChange, placeholder, style, className }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; style?: React.CSSProperties; className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px';
  }, [value]);
  return <textarea ref={ref} className={className} value={value} onChange={onChange}
    placeholder={placeholder} rows={2} style={{ ...style, resize: 'none', overflow: 'hidden' }} />;
}

function pluralKrok(n: number) {
  if (n === 1) return '1 крок'; if (n <= 4) return `${n} кроки`; return `${n} кроків`;
}

export function PromoteDreamModal({ dream, spheres, onClose, onPromoted }: Props) {
  const [step, setStep]         = useState<Step>(1);
  const [sphereId, setSphereId] = useState(spheres[0]?.id ?? '');
  const [tasks, setTasks]       = useState<TaskDraft[]>([]);
  const [aiError, setAiError]   = useState<string | null>(null);

  const [isAiPending, startAi]   = useTransition();
  const [isSaving, startSave]    = useTransition();

  const sphere = spheres.find(s => s.id === sphereId) ?? spheres[0];
  const col    = sphere ? `hsl(var(--sphere-${sphere.key}))` : 'hsl(var(--sphere-violet))';
  const soft   = sphere ? `hsl(var(--sphere-${sphere.key}-soft))` : 'hsl(var(--sphere-violet-soft))';

  function update(id: string, patch: Partial<TaskDraft>) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  }
  const valid = tasks.filter(t => t.specific.trim());

  function handleAI() {
    setAiError(null);
    const today = new Date().toISOString().slice(0, 10);
    startAi(async () => {
      try {
        const steps = await decomposeWithAI(dream.title, sphere?.name ?? '', today);
        setTasks(steps.map(s => mkDraft(s.specific, s.deadline)));
        setStep(2);
      } catch {
        setAiError('Не вдалося згенерувати кроки. Спробуй ще.');
      }
    });
  }

  function handleManual() {
    setTasks([mkDraft()]);
    setAiError(null);
    setStep(2);
  }

  // Create goal + tasks in one shot — avoids state sync bug
  function handleSave() {
    startSave(async () => {
      try {
        const goalId = await createGoalFromDream(dream.title, sphereId);
        if (valid.length > 0) {
          await createTasks(goalId, valid.map(t => ({
            specific: t.specific.trim(),
            deadline: t.deadline || undefined,
            recurrence: t.recurrence,
          })));
        }
        onPromoted(dream.id);
        setStep(3);
      } catch {
        setAiError('Помилка збереження. Спробуй ще раз.');
      }
    });
  }

  const INPUT: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid hsl(var(--border-field))',
    background: 'hsl(var(--surface-sunken))',
    fontFamily: 'var(--font-sans)', fontSize: 14,
    color: 'hsl(var(--text-strong))', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      <style>{`
        @keyframes pdm-fade  { from{opacity:0} to{opacity:1} }
        @keyframes pdm-modal { from{transform:translate(-50%,-47%) scale(.96);opacity:0} to{transform:translate(-50%,-50%) scale(1);opacity:1} }
        @keyframes pdm-spin  { to{transform:rotate(360deg)} }
        .pdm-sphere-btn { transition: all .15s; }
        .pdm-pill { transition: background .15s, border-color .15s, color .15s; }
        .pdm-ta::placeholder { color: hsl(var(--text-faint)); }
        .pdm-ta:focus { outline: none; }
        .pdm-date::-webkit-calendar-picker-indicator { opacity: .4; cursor: pointer; }
        .pdm-ai:hover:not(:disabled) { opacity: .88; }
        .pdm-manual:hover { background: ${soft} !important; border-color: ${col} !important; }
      `}</style>

      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'hsl(28 16% 10% / .52)', backdropFilter: 'blur(5px)',
        animation: 'pdm-fade .2s ease',
      }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 61, width: 'calc(100% - 32px)', maxWidth: 500, maxHeight: '88vh',
        background: 'hsl(var(--surface-card))',
        borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-xl)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'pdm-modal .3s cubic-bezier(.32,.9,.3,1)',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '20px 22px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {(['Сфера', 'Кроки', 'Готово'] as const).map((label, i) => {
                const n = (i + 1) as Step;
                const active = step === n, done = step > n;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && <div style={{ width: 24, height: 1.5, background: done ? col : 'hsl(var(--border-subtle))', transition: 'background .3s' }} />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: i < 2 ? '0 3px 0 0' : 0 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999,
                        background: (done || active) ? col : 'hsl(var(--surface-sunken))',
                        border: `1.5px solid ${(done || active) ? col : 'hsl(var(--border-subtle))'}`,
                        color: (done || active) ? '#fff' : 'hsl(var(--text-faint))',
                        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .3s',
                      }}>{done ? '✓' : n}</div>
                      <span style={{
                        fontSize: 12.5, fontWeight: active ? 700 : 500, fontFamily: 'var(--font-sans)',
                        color: active ? 'hsl(var(--text-strong))' : done ? col : 'hsl(var(--text-faint))',
                      }}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'hsl(var(--surface-sunken))', color: 'hsl(var(--text-muted))',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px' }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ paddingBottom: 24 }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 700,
                color: 'hsl(var(--text-faint))', letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: 5,
              }}>Мрія → Ціль</div>
              <h2 style={{
                fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 19,
                letterSpacing: '-0.02em', color: 'hsl(var(--text-strong))',
                lineHeight: 1.25, marginBottom: 20,
              }}>{dream.title}</h2>

              {/* Sphere */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
                  color: 'hsl(var(--text-muted))', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: 9,
                }}>Яка сфера?</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {spheres.map(s => {
                    const on = s.id === sphereId;
                    return (
                      <button key={s.id} className="pdm-sphere-btn"
                        onClick={() => setSphereId(s.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '7px 13px', borderRadius: 'var(--radius-pill)',
                          border: `1.5px solid ${on ? `hsl(var(--sphere-${s.key}))` : 'hsl(var(--border-subtle))'}`,
                          background: on ? `hsl(var(--sphere-${s.key}-soft))` : 'transparent',
                          cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                          color: on ? `hsl(var(--sphere-${s.key}))` : 'hsl(var(--text-muted))',
                        }}
                      >
                        <span>{s.icon}</span> {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {aiError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 14,
                  background: 'hsl(var(--overdue-soft))', color: 'hsl(var(--overdue))',
                  fontFamily: 'var(--font-sans)', fontSize: 13,
                }}>{aiError}</div>
              )}

              {/* Primary: AI */}
              <button className="pdm-ai" onClick={handleAI} disabled={isAiPending}
                style={{
                  width: '100%', padding: '15px 20px', borderRadius: 'var(--radius-xl)',
                  background: col, color: '#fff', border: 'none',
                  cursor: isAiPending ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left',
                  boxShadow: `0 6px 20px ${col.replace('hsl(', 'hsl(').replace(')', ' / .3)')}`,
                  marginBottom: 9, opacity: isAiPending ? .8 : 1, transition: 'opacity .15s',
                }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 999, background: 'rgba(255,255,255,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16,
                }}>
                  {isAiPending
                    ? <span style={{ display: 'inline-block', animation: 'pdm-spin 1s linear infinite' }}>⟳</span>
                    : '✦'}
                </span>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                    {isAiPending ? 'Генерую кроки…' : 'Розпланувати з AI'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, opacity: .85, marginTop: 2 }}>
                    {isAiPending ? 'Кілька секунд…' : 'Claude підбере 3–5 конкретних кроків'}
                  </div>
                </div>
              </button>

              {/* Secondary: Manual */}
              <button className="pdm-manual" onClick={handleManual} disabled={isAiPending}
                style={{
                  width: '100%', padding: '12px 20px', borderRadius: 'var(--radius-xl)',
                  border: '1.5px solid hsl(var(--border-subtle))', background: 'transparent',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                  color: 'hsl(var(--text-body))', transition: 'all .15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                <span>Додам кроки сам</span>
                <span style={{ color: 'hsl(var(--text-faint))' }}>→</span>
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div style={{ paddingBottom: 24 }}>
              {/* Sphere chip */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14,
                padding: '4px 10px 4px 7px', borderRadius: 'var(--radius-pill)', background: soft,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: col }} />
                <span style={{ fontSize: 13 }}>{sphere?.icon}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: col, fontFamily: 'var(--font-sans)' }}>
                  {sphere?.name}
                </span>
              </div>

              <h2 style={{
                fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 18,
                color: 'hsl(var(--text-strong))', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 4,
              }}>{dream.title}</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'hsl(var(--text-muted))', marginBottom: 18 }}>
                Перевір або відредагуй кроки перед збереженням.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tasks.map((t, idx) => (
                  <div key={t.id} style={{
                    display: 'flex', gap: 12, padding: '14px 0',
                    borderBottom: idx < tasks.length - 1 ? '1px solid hsl(var(--border-subtle) / .55)' : 'none',
                  }}>
                    <div style={{ flexShrink: 0, paddingTop: 2 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 999,
                        background: t.specific.trim() ? col : 'hsl(var(--surface-sunken))',
                        border: `1.5px solid ${t.specific.trim() ? col : 'hsl(var(--border-subtle))'}`,
                        color: t.specific.trim() ? '#fff' : 'hsl(var(--text-faint))',
                        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .2s',
                      }}>{idx + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <AutoTextarea
                        className="pdm-ta"
                        value={t.specific}
                        onChange={e => update(t.id, { specific: e.target.value })}
                        placeholder="Що конкретно зробити?"
                        style={{
                          width: '100%', border: 'none', outline: 'none',
                          background: 'transparent', padding: 0,
                          fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 500,
                          color: 'hsl(var(--text-strong))', lineHeight: 1.5,
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                        <input type="date" value={t.deadline}
                          onChange={e => update(t.id, { deadline: e.target.value })}
                          min={new Date().toISOString().slice(0, 10)}
                          className="pdm-date"
                          style={{
                            border: 'none', outline: 'none', background: 'transparent', padding: 0,
                            fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
                            color: t.deadline ? col : 'hsl(var(--text-faint))',
                          }}
                        />
                      </div>
                    </div>
                    {tasks.length > 1 && (
                      <button onClick={() => setTasks(ts => ts.filter(x => x.id !== t.id))}
                        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-faint))', fontSize: 14, alignSelf: 'flex-start', paddingTop: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--text-muted))')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--text-faint))')}
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>

              {tasks.length < 5 && (
                <button onClick={() => setTasks(ts => [...ts, mkDraft()])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    marginTop: 6, padding: '10px 0',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                    color: 'hsl(var(--text-faint))', transition: 'color .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--text-muted))')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--text-faint))')}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: '1.5px dashed hsl(var(--border-subtle))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>+</span>
                  Додати крок
                </button>
              )}

              {aiError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)', marginTop: 10,
                  background: 'hsl(var(--overdue-soft))', color: 'hsl(var(--overdue))',
                  fontFamily: 'var(--font-sans)', fontSize: 13,
                }}>{aiError}</div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div style={{ paddingBottom: 24, paddingTop: 8 }}>
              <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 999, background: soft, color: col,
                  fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>🚀</div>
                <h2 style={{
                  fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 22,
                  color: 'hsl(var(--text-strong))', letterSpacing: '-0.025em', marginBottom: 6,
                }}>Ціль створена!</h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'hsl(var(--text-muted))' }}>
                  «{dream.title}»{valid.length > 0 && <> · {pluralKrok(valid.length)}</>}
                </p>
              </div>

              {valid.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {valid.map((t, i) => (
                    <div key={t.id} style={{
                      padding: '10px 13px', borderRadius: 'var(--radius-md)',
                      background: 'hsl(var(--surface-sunken))',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 999, background: col, color: '#fff', flexShrink: 0,
                        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10, marginTop: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{i + 1}</span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: 'hsl(var(--text-strong))' }}>{t.specific}</div>
                        {t.deadline && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'hsl(var(--text-muted))', marginTop: 2 }}>
                            до {new Date(t.deadline + 'T12:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '13px 22px 20px', flexShrink: 0,
          borderTop: '1px solid hsl(var(--border-subtle))',
          display: 'flex', justifyContent: step === 3 ? 'stretch' : 'space-between',
          alignItems: 'center', background: 'hsl(var(--surface-card))',
        }}>
          {step === 1 && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--text-muted))' }}>
              Скасувати
            </button>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--text-muted))' }}>
                ← Назад
              </button>
              <button onClick={handleSave} disabled={valid.length === 0 || isSaving}
                style={{
                  padding: '11px 22px', borderRadius: 'var(--radius-md)', border: 'none',
                  cursor: valid.length > 0 && !isSaving ? 'pointer' : 'not-allowed',
                  background: valid.length > 0 ? col : 'hsl(var(--border-subtle))',
                  color: valid.length > 0 ? '#fff' : 'hsl(var(--text-faint))',
                  fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14.5,
                  boxShadow: valid.length > 0 ? `0 4px 14px ${col.replace(')', ' / .3)')}` : 'none',
                  transition: 'all .2s',
                }}
              >
                {isSaving ? 'Зберігаємо…' : `Зберегти ${valid.length > 0 ? pluralKrok(valid.length) : ''} →`}
              </button>
            </>
          )}
          {step === 3 && (
            <button onClick={onClose} style={{
              flex: 1, padding: '13px', borderRadius: 'var(--radius-md)',
              background: col, color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15,
            }}>
              Перейти до цілей →
            </button>
          )}
        </div>
      </div>
    </>
  );
}
