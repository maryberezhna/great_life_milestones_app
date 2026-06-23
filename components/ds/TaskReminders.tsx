'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Task {
  id: string;
  specific: string;
  deadline: string;
  plan_goals: { title: string } | { title: string }[] | null;
}

export function TaskReminders() {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
    fetchTodayTasks();
  }, []);

  async function fetchTodayTasks() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().slice(0, 10);
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;

    const { data } = await supabase
      .from('plan_tasks')
      .select('id, specific, deadline, plan_goals(title)')
      .eq('user_id', user.id)
      .in('status', ['active', 'postponed'])
      .gte('deadline', todayStart)
      .lte('deadline', todayEnd)
      .order('deadline')
      .limit(5);

    if (data?.length) {
      setTodayTasks(data as Task[]);
      maybeSendNotifications(data as Task[]);
    }
  }

  function maybeSendNotifications(tasks: Task[]) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const shownKey = `notified_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(shownKey)) return;

    tasks.slice(0, 3).forEach((t, i) => {
      setTimeout(() => {
        const goal = Array.isArray(t.plan_goals) ? t.plan_goals[0] : t.plan_goals;
        new Notification('Сьогодні треба зробити', {
          body: `${t.specific}${goal?.title ? ` · ${goal.title}` : ''}`,
          icon: '/favicon.ico',
          tag: t.id,
        });
      }, i * 500);
    });

    localStorage.setItem(shownKey, '1');
  }

  async function requestPermission() {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      maybeSendNotifications(todayTasks);
    }
  }

  if (dismissed || todayTasks.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100,
      background: 'hsl(var(--surface-card))',
      border: '1px solid hsl(var(--border-subtle))',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      padding: '16px 20px',
      maxWidth: 320, minWidth: 260,
      animation: 'slide-up .3s cubic-bezier(0.22, 0.61, 0.36, 1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700,
            color: 'hsl(var(--text-strong))', marginBottom: 6,
          }}>
            🔔 Сьогодні на порядку
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {todayTasks.slice(0, 3).map(t => (
              <div key={t.id} style={{
                fontFamily: 'var(--font-sans)', fontSize: 12.5,
                color: 'hsl(var(--text-body))', lineHeight: 1.4,
                display: 'flex', alignItems: 'flex-start', gap: 6,
              }}>
                <span style={{ color: 'hsl(var(--primary))', flexShrink: 0, marginTop: 1 }}>·</span>
                {t.specific}
              </div>
            ))}
            {todayTasks.length > 3 && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'hsl(var(--text-faint))' }}>
                +{todayTasks.length - 3} більше
              </div>
            )}
          </div>

          {permission === 'default' && (
            <button
              onClick={requestPermission}
              style={{
                marginTop: 10, padding: '5px 12px',
                borderRadius: 'var(--radius-pill)',
                border: '1.5px solid hsl(var(--primary))',
                background: 'hsl(var(--primary-soft))',
                color: 'hsl(var(--primary))',
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Увімкнути сповіщення
            </button>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'hsl(var(--text-faint))', fontSize: 16, flexShrink: 0,
            padding: '0 2px', lineHeight: 1,
          }}
          aria-label="Закрити"
        >
          ×
        </button>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
