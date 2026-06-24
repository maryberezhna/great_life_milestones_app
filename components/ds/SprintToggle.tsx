'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setGoalSprint } from '@/app/actions/goals';

interface Props {
  goalId: string;
  isSprint: boolean;
  accent: string;
  soft: string;
}

export function SprintToggle({ goalId, isSprint, accent, soft }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await setGoalSprint(goalId, !isSprint);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      title={isSprint ? 'Прибрати з спринту' : 'Зробити основним фокусом зараз'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 'var(--radius-pill)',
        border: `1.5px solid ${isSprint ? accent : 'hsl(var(--border-subtle))'}`,
        background: isSprint ? accent : 'transparent',
        color: isSprint ? '#fff' : 'hsl(var(--text-muted))',
        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700,
        cursor: isPending ? 'wait' : 'pointer',
        opacity: isPending ? 0.7 : 1,
        transition: 'all .15s',
        letterSpacing: '0.02em',
      }}
    >
      <span style={{ fontSize: 13 }}>⚡</span>
      {isSprint ? 'Спринт' : 'Додати в спринт'}
    </button>
  );
}
