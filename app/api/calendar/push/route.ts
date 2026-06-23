import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleClientForUser } from '@/lib/google';

interface PushBody {
  taskId: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: PushBody = await request.json();
  if (!body.taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

  // Fetch the task (RLS ensures it belongs to this user)
  const { data: task, error: taskErr } = await supabase
    .from('plan_tasks')
    .select('id, specific, action, result, deadline, calendar_event_id, plan_goals(title)')
    .eq('id', body.taskId)
    .single();

  if (taskErr || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  if (!task.deadline) {
    return NextResponse.json({ error: 'Task has no deadline' }, { status: 422 });
  }

  let auth;
  try {
    auth = await getGoogleClientForUser(user.id);
  } catch {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 403 });
  }

  const calendar = google.calendar({ version: 'v3', auth });

  const goalTitle = Array.isArray(task.plan_goals)
    ? task.plan_goals[0]?.title
    : (task.plan_goals as { title: string } | null)?.title;

  const summary = task.specific ?? goalTitle ?? 'Task';
  const description = [
    task.action && `Action: ${task.action}`,
    task.result && `Result: ${task.result}`,
  ]
    .filter(Boolean)
    .join('\n');

  // All-day event on the deadline date
  const dateStr = task.deadline.slice(0, 10);
  const eventBody = {
    summary,
    description: description || undefined,
    start: { date: dateStr },
    end: { date: dateStr },
  };

  let eventId: string;

  if (task.calendar_event_id) {
    // Update existing event
    const { data: updated } = await calendar.events.update({
      calendarId: 'primary',
      eventId: task.calendar_event_id,
      requestBody: eventBody,
    });
    eventId = updated.id!;
  } else {
    // Create new event
    const { data: created } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventBody,
    });
    eventId = created.id!;
  }

  // Save event ID back to task (use admin to bypass any RLS edge cases)
  const admin = createAdminClient();
  await admin
    .from('plan_tasks')
    .update({ calendar_event_id: eventId })
    .eq('id', task.id);

  return NextResponse.json({ eventId });
}
