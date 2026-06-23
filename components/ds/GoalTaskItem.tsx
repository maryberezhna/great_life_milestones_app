'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TaskItem } from './TaskItem';
import { updateTaskStatus } from '@/app/actions';

type DbStatus = 'active' | 'postponed' | 'done' | 'irrelevant';
type DsStatus = 'active' | 'hold' | 'done' | 'overdue' | 'dropped';

const DB_TO_DS: Record<DbStatus, DsStatus> = {
  active: 'active',
  postponed: 'hold',
  done: 'done',
  irrelevant: 'dropped',
};

interface GoalTaskItemProps {
  id: string;
  goalId: string;
  specific: string;
  action?: string | null;
  deadline?: string | null;
  status: DbStatus;
  calendarEventId?: string | null;
  accent?: string;
}

export function GoalTaskItem({ id, goalId, specific, action, deadline, status, accent }: GoalTaskItemProps) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  const dsStatus = DB_TO_DS[status] ?? 'active';
  const isDone = status === 'done';

  function mutate(newStatus: DbStatus) {
    startTransition(async () => {
      await updateTaskStatus(id, newStatus, goalId);
      router.refresh();
    });
  }

  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
    : undefined;

  return (
    <TaskItem
      title={specific}
      subtitle={action ?? undefined}
      deadline={formattedDeadline}
      status={dsStatus}
      accent={accent}
      onToggle={() => mutate(isDone ? 'active' : 'done')}
      onRollover={() => mutate('postponed')}
      onDrop={() => mutate('irrelevant')}
    />
  );
}
