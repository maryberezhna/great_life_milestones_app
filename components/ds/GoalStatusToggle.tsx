'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setGoalStatus } from '@/app/actions/goals';

interface Props {
  goalId: string;
  currentStatus: string;
}

export function GoalStatusToggle({ goalId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();

  const isHold = status === 'paused' || status === 'hold';
  const isDone = status === 'done';

  function toggle() {
    const next = isHold ? 'active' : 'paused';
    startTransition(async () => {
      setStatus(next);
      await setGoalStatus(goalId, next);
      router.refresh();
    });
  }

  function markDone() {
    startTransition(async () => {
      setStatus('done');
      await setGoalStatus(goalId, 'done');
      router.refresh();
    });
  }

  function reactivate() {
    startTransition(async () => {
      setStatus('active');
      await setGoalStatus(goalId, 'active');
      router.refresh();
    });
  }

  if (isDone) {
    return (
      <button
        onClick={reactivate}
        disabled={isPending}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 'var(--radius-pill)',
          border: '1.5px solid hsl(var(--success))',
          background: 'hsl(var(--success-soft))',
          color: 'hsl(var(--success))',
          fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', opacity: isPending ? 0.6 : 1,
        }}
      >
        ✓ Завершено — поновити?
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={toggle}
        disabled={isPending}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 'var(--radius-pill)',
          border: `1.5px solid ${isHold ? 'hsl(var(--primary))' : 'hsl(var(--border-subtle))'}`,
          background: isHold ? 'hsl(var(--primary-soft))' : 'transparent',
          color: isHold ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
          fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', opacity: isPending ? 0.6 : 1,
          transition: 'all .15s',
        }}
      >
        {isHold ? '▶ Поновити' : '⏸ Пауза'}
      </button>

      {!isHold && (
        <button
          onClick={markDone}
          disabled={isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 'var(--radius-pill)',
            border: '1.5px solid hsl(var(--border-subtle))',
            background: 'transparent',
            color: 'hsl(var(--text-muted))',
            fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', opacity: isPending ? 0.6 : 1,
            transition: 'all .15s',
          }}
        >
          ✓ Завершити ціль
        </button>
      )}
    </div>
  );
}
