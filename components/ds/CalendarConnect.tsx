'use client';

import { useState, useTransition } from 'react';
import { setCalendarProvider, type CalendarSettings } from '@/app/actions/calendar';
import { forgetCalendarProvider } from './AddToCalendarButton';

const NAMES = { google: 'Google Calendar', apple: 'Apple чи інший календар' } as const;

// «Календар»: connect the calendar once; every «Додати в календар» then sends steps there
export function CalendarConnect({ settings, googleStatus, highlight }: {
  settings: CalendarSettings;
  googleStatus?: string;   // ?google=connected | error | not_configured after the consent screen
  highlight?: boolean;     // came here from a goal's «Додати в календар»
}) {
  const [provider, setProvider] = useState(settings.provider);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startT] = useTransition();

  function chooseApple() {
    setError('');
    startT(async () => {
      try { await setCalendarProvider('apple'); setProvider('apple'); setChanging(false); forgetCalendarProvider(); }
      catch { setError('Не вдалося зберегти. Спробуй ще раз.'); }
    });
  }

  function disconnect() {
    setError('');
    startT(async () => {
      try { await setCalendarProvider(null); setProvider(null); setChanging(false); forgetCalendarProvider(); }
      catch { setError('Не вдалося відключити. Спробуй ще раз.'); }
    });
  }

  const card: React.CSSProperties = {
    flex: '1 1 220px', textAlign: 'left', padding: '14px 16px', borderRadius: 'var(--radius-lg)',
    border: '1.5px solid hsl(var(--border-subtle))', background: 'hsl(var(--surface-card))',
    fontFamily: 'var(--font-sans)', cursor: 'pointer', color: 'hsl(var(--text-body))',
    textDecoration: 'none', display: 'block',
  };

  // connected: one quiet line
  if (provider && !changing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '12px 16px', borderRadius: 'var(--radius-lg)', marginBottom: 20,
        background: 'hsl(var(--success-soft))', border: '1px solid hsl(var(--success) / .35)',
        fontFamily: 'var(--font-sans)', fontSize: 14, color: 'hsl(var(--text-body))',
      }}>
        <span>📅 Підключено: <strong>{NAMES[provider]}</strong>
          {googleStatus === 'connected' && provider === 'google' && ' — готово!'}
        </span>
        <span style={{ fontSize: 12.5, color: 'hsl(var(--text-muted))' }}>
          {provider === 'google'
            ? '«Додати в календар» на цілі одразу кладе кроки в Google Calendar.'
            : '«Додати в календар» на цілі дає файл — iPhone і Mac додають кроки в Календар.'}
        </span>
        <button onClick={() => setChanging(true)} style={{
          marginLeft: 'auto', border: 'none', background: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'hsl(var(--primary))',
        }}>Змінити</button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 'var(--radius-xl)', marginBottom: 24,
      background: 'hsl(var(--surface-sunken))',
      border: `1.5px solid ${highlight ? 'hsl(var(--primary))' : 'hsl(var(--border-subtle))'}`,
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-strong))' }}>Підключи свій календар</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'hsl(var(--text-muted))', margin: '4px 0 14px' }}>
        Один раз — і на кожній цілі буде одна кнопка «Додати в календар».
      </div>

      {googleStatus === 'error' && (
        <div style={{ fontSize: 13, color: 'hsl(var(--overdue))', marginBottom: 12 }}>⚠ Google не підключився. Спробуй ще раз.</div>
      )}
      {(googleStatus === 'not_configured') && (
        <div style={{ fontSize: 13, color: 'hsl(var(--overdue))', marginBottom: 12 }}>⚠ Google ще не налаштований на сервері.</div>
      )}
      {error && <div style={{ fontSize: 13, color: 'hsl(var(--overdue))', marginBottom: 12 }}>⚠ {error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {settings.googleReady ? (
          <a href="/api/calendar/google/connect" style={card}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-strong))' }}>🗓 Google Calendar</div>
            <div style={{ fontSize: 12.5, color: 'hsl(var(--text-muted))', marginTop: 3 }}>Кроки зʼявляються в Google одразу. Підключити →</div>
          </a>
        ) : (
          <div style={{ ...card, cursor: 'default', opacity: .6 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-strong))' }}>🗓 Google Calendar</div>
            <div style={{ fontSize: 12.5, color: 'hsl(var(--text-muted))', marginTop: 3 }}>
              Ще не налаштований: на сервері немає ключів Google (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY).
            </div>
          </div>
        )}
        <button onClick={chooseApple} disabled={isPending} style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-strong))' }}>🍎 Apple чи інший календар</div>
          <div style={{ fontSize: 12.5, color: 'hsl(var(--text-muted))', marginTop: 3 }}>Кроки приходять файлом календаря — iPhone і Mac додають їх у Календар. Обрати →</div>
        </button>
      </div>

      {provider && (
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <button onClick={() => setChanging(false)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-muted))' }}>Скасувати</button>
          <button onClick={disconnect} disabled={isPending} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'hsl(var(--overdue))' }}>Відключити {NAMES[provider]}</button>
        </div>
      )}
    </div>
  );
}
