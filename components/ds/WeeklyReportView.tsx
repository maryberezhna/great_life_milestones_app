'use client';

import { useState, useTransition } from 'react';
import { generateWeeklyReport, deleteReport, type WeeklyReport } from '@/app/actions/report';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

// a report looks back over the 7 days before it was generated (see generateWeeklyReport)
function weekOf(iso: string): string {
  const end = new Date(iso);
  const start = new Date(end.getTime() - 7 * 86_400_000);
  const day = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric' });
  const dayMonth = (d: Date) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  return start.getMonth() === end.getMonth()
    ? `${day(start)}–${dayMonth(end)}`
    : `${dayMonth(start)} – ${dayMonth(end)}`;
}

export function WeeklyReportView({ initialReports }: { initialReports: WeeklyReport[] }) {
  const [reports, setReports] = useState<WeeklyReport[]>(initialReports);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialReports[0]?.id);
  const report = reports.find(r => r.id === selectedId) ?? null;
  const isLatest = !!report && report.id === reports[0]?.id;
  const [listOpen, setListOpen] = useState(false);

  function remove(id: string) {
    if (!window.confirm('Видалити цей звіт?')) return;
    const rest = reports.filter(r => r.id !== id);
    setReports(rest);
    if (selectedId === id) setSelectedId(rest[0]?.id);
    deleteReport(id).catch(() => { setReports(reports); setError('Не вдалося видалити звіт'); });
  }
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError('');
    startTransition(async () => {
      try {
        const r = await generateWeeklyReport();
        setReports(rs => [r, ...rs]);
        setSelectedId(r.id);
        setListOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Помилка генерації звіту');
      }
    });
  }

  const generatedDate = report?.generatedAt ? fmt(report.generatedAt) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid hsl(var(--border-subtle))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 28,
              letterSpacing: '-0.02em', color: 'hsl(var(--text-strong))', margin: 0,
            }}>
              Тижневий звіт
            </h1>
            {report && (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'hsl(var(--text-muted))', marginTop: 4 }}>
                За тиждень {weekOf(report.generatedAt)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {reports.length > 0 && (
            <button
              onClick={() => setListOpen(o => !o)}
              aria-expanded={listOpen}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 'var(--radius-pill)',
                border: `1.5px solid ${listOpen ? 'hsl(var(--primary))' : 'hsl(var(--border-subtle))'}`,
                background: listOpen ? 'hsl(var(--primary-soft))' : 'hsl(var(--surface-card))',
                color: listOpen ? 'hsl(var(--primary))' : 'hsl(var(--text-body))',
                fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              🗂 Попередні звіти
              {reports.length > 1 && <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700,
                padding: '1px 7px', borderRadius: 999, background: 'hsl(var(--surface-sunken))',
                color: 'hsl(var(--text-muted))',
              }}>{reports.length - 1}</span>}
            </button>
          )}

          <button
            onClick={generate}
            disabled={isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: isPending ? 'hsl(var(--primary-soft))' : 'hsl(var(--primary))',
              color: isPending ? 'hsl(var(--primary))' : 'hsl(var(--primary-on))',
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              transition: 'all .15s',
            }}
          >
            {isPending ? (
              <>
                <span style={{ animation: 'spin .8s linear infinite', display: 'inline-block' }}>◌</span>
                Аналізую…
              </>
            ) : (
              <>◈ {reports.length ? 'Новий звіт' : 'Згенерувати звіт'}</>
            )}
          </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: 640 }}>
          {error && (
            <div style={{
              background: 'hsl(var(--destructive-soft))',
              border: '1px solid hsl(var(--destructive))',
              borderRadius: 'var(--radius-md)', padding: '12px 16px',
              fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--destructive))',
              marginBottom: 24,
            }}>
              {error}
            </div>
          )}

          {/* All kept reports, newest first — open any of them */}
          {listOpen && !isPending && (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
                textTransform: 'uppercase', color: 'hsl(var(--text-faint))', marginBottom: 10,
              }}>Усі збережені звіти</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reports.map((r, i) => {
                  const on = r.id === selectedId;
                  return (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: on ? 'hsl(var(--primary-soft))' : 'hsl(var(--surface-card))',
                      border: `1px solid ${on ? 'hsl(var(--primary) / .35)' : 'hsl(var(--border-subtle))'}`,
                    }}>
                      <button onClick={() => { setSelectedId(r.id); setListOpen(false); }} style={{
                        flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'hsl(var(--text-strong))' }}>
                            Тиждень {weekOf(r.generatedAt)}
                          </span>
                          {i === 0 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 700, color: 'hsl(var(--primary))' }}>останній</span>}
                          {on && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'hsl(var(--text-faint))' }}>відкрито</span>}
                        </div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'hsl(var(--text-muted))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{r.summary}</div>
                      </button>
                      <button onClick={() => r.id && remove(r.id)} aria-label="Видалити звіт" style={{
                        width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: 'hsl(var(--surface-sunken))', color: 'hsl(var(--text-muted))', flexShrink: 0,
                      }}>✕</button>
                    </div>
                  );
                })}
              </div>
              {reports.length === 1 && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.55, color: 'hsl(var(--text-muted))', margin: '12px 2px 0' }}>
                  Поки що збережено лише цей звіт. Кожен наступний теж лишиться тут — можна буде відкрити будь-який тиждень.
                </p>
              )}
            </div>
          )}

          {report && !isLatest && !isPending && !listOpen && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              padding: '10px 14px', marginBottom: 20, borderRadius: 'var(--radius-md)',
              background: 'hsl(var(--surface-sunken))',
              fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'hsl(var(--text-body))',
            }}>
              <span>Це попередній звіт — за {weekOf(report.generatedAt)}</span>
              <button onClick={() => setSelectedId(reports[0]?.id)} style={{
                border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700, color: 'hsl(var(--primary))',
              }}>До останнього →</button>
            </div>
          )}

          {!report && !isPending && (
            <div style={{
              border: '2px dashed hsl(var(--border-subtle))',
              borderRadius: 'var(--radius-xl)', padding: '56px 32px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>◈</div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600,
                color: 'hsl(var(--text-strong))', marginBottom: 8,
              }}>
                Тижневий звіт готовий до аналізу
              </div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 14,
                color: 'hsl(var(--text-muted))', lineHeight: 1.6,
              }}>
                Звіт підсумує зроблені кроки й активні цілі та підкаже, <br/>
                на що варто звернути увагу наступного тижня.
              </div>
            </div>
          )}

          {isPending && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: i === 1 ? 80 : 120,
                  borderRadius: 'var(--radius-lg)',
                  background: 'hsl(var(--surface-card))',
                  border: '1px solid hsl(var(--border-subtle))',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          )}

          {report && !isPending && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Summary card */}
              <div style={{
                background: 'hsl(var(--primary-soft))',
                border: '1px solid hsl(var(--primary) / 0.2)',
                borderRadius: 'var(--radius-xl)', padding: '24px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                  color: 'hsl(var(--primary))', textTransform: 'uppercase',
                  letterSpacing: '0.06em', marginBottom: 10,
                }}>
                  Підсумок тижня
                </div>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.6,
                  color: 'hsl(var(--text-strong))', margin: 0,
                }}>
                  {report.summary}
                </p>
              </div>

              {/* Wins */}
              {report.wins.length > 0 && (
                <ReportSection
                  icon="✓"
                  color="var(--success)"
                  softColor="var(--success-soft)"
                  title="Що вийшло"
                  items={report.wins}
                />
              )}

              {/* Focus */}
              {report.focus.length > 0 && (
                <ReportSection
                  icon="→"
                  color="var(--sphere-violet)"
                  softColor="var(--sphere-violet-soft)"
                  title="Фокус на наступний тиждень"
                  items={report.focus}
                />
              )}

              {/* Encouragement */}
              {report.encouragement && (
                <div style={{
                  background: 'hsl(var(--surface-card))',
                  border: '1px solid hsl(var(--border-subtle))',
                  borderRadius: 'var(--radius-xl)', padding: '20px 24px',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>💬</span>
                  <p style={{
                    fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.6,
                    color: 'hsl(var(--text-body))', margin: 0, fontStyle: 'italic',
                  }}>
                    {report.encouragement}
                  </p>
                </div>
              )}

              {generatedDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => report?.id && remove(report.id)} style={{
                    border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, color: 'hsl(var(--text-faint))',
                  }}>🗑 Видалити звіт</button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'hsl(var(--text-faint))' }}>
                    Збережено {generatedDate}
                  </span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function ReportSection({
  icon, color, softColor, title, items,
}: {
  icon: string;
  color: string;
  softColor: string;
  title: string;
  items: string[];
}) {
  return (
    <div style={{
      background: 'hsl(var(--surface-card))',
      border: '1px solid hsl(var(--border-subtle))',
      borderRadius: 'var(--radius-xl)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: 8,
          background: `hsl(${softColor})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: `hsl(${color})`,
          flexShrink: 0,
        }}>
          {icon}
        </span>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
          color: 'hsl(var(--text-strong))',
        }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '11px 20px',
            borderBottom: i < items.length - 1 ? '1px solid hsl(var(--border-subtle) / 0.5)' : 'none',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999, flexShrink: 0, marginTop: 6,
              background: `hsl(${color})`,
            }} />
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.5,
              color: 'hsl(var(--text-body))',
            }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
