'use client';

import { useState, useTransition } from 'react';
import { generateWeeklyReport, type WeeklyReport } from '@/app/actions/report';

export function WeeklyReportView() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError('');
    startTransition(async () => {
      try {
        const r = await generateWeeklyReport();
        setReport(r);
      } catch (e: any) {
        setError(e.message ?? 'Помилка генерації звіту');
      }
    });
  }

  const generatedDate = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('uk-UA', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid hsl(var(--border-subtle))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
              color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              AI-аналіз
            </div>
            <h1 style={{
              fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 28,
              letterSpacing: '-0.02em', color: 'hsl(var(--text-strong))', marginTop: 2,
            }}>
              Тижневий звіт
            </h1>
          </div>

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
              <>◈ {report ? 'Оновити' : 'Згенерувати звіт'}</>
            )}
          </button>
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
                AI проаналізує виконані задачі, активні цілі та підкаже, <br/>
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
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'hsl(var(--text-faint))', textAlign: 'right',
                }}>
                  Згенеровано {generatedDate}
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
