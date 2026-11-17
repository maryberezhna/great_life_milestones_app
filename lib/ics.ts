export interface IcsEvent {
  uid: string;
  title: string;
  date: string;       // YYYY-MM-DD
  time?: string;      // HH:MM, default '09:00'
  description?: string;
  rrule?: string;     // e.g. 'RRULE:FREQ=WEEKLY'
  allDay?: boolean;   // a goal's deadline — the whole day, no time
}

// a step's repeat (plan_tasks.recurrence) → RRULE
export const RECURRENCE_RRULE: Record<string, string> = {
  daily: 'RRULE:FREQ=DAILY', weekdays: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  weekly: 'RRULE:FREQ=WEEKLY', monthly: 'RRULE:FREQ=MONTHLY',
};

// uid of a goal's deadline event — steps use their own id
export const GOAL_UID_PREFIX = 'goal-';

// A goal's deadline as an all-day event; only while it is still ahead and the goal is open.
export function goalDeadlineEvent(goal: { id: string; title: string; targetDate: string | null; status?: string }): IcsEvent | null {
  const date = goal.targetDate?.slice(0, 10);
  if (!date || goal.status === 'done' || date < new Date().toISOString().slice(0, 10)) return null;
  return { uid: GOAL_UID_PREFIX + goal.id, title: `🎯 ${goal.title}`, date, allDay: true, description: 'Дедлайн цілі' };
}

// Every step reminds 2 h and 1 h before start;
// a goal's deadline — a week before and at 9:00 the day before
const REMINDERS = ['-PT2H', '-PT1H'];
const ALL_DAY_REMINDERS = ['-P7D', '-PT15H'];
// the same, in minutes, for Google
export const REMINDER_MINUTES = [120, 60];
export const ALL_DAY_REMINDER_MINUTES = [7 * 24 * 60, 15 * 60];

export function nextDay(date: string) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function addHour(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${pad((h + 1) % 24)}:${pad(m)}`;
}

function icsDateTime(date: string, time: string) {
  return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
}

export function generateIcs(events: IcsEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planning App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}@planning-app`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`);
      lines.push(`DTEND;VALUE=DATE:${nextDay(e.date).replace(/-/g, '')}`);
    } else {
      const t = e.time ?? '09:00';
      lines.push(`DTSTART:${icsDateTime(e.date, t)}`);
      lines.push(`DTEND:${icsDateTime(e.date, addHour(t))}`);
    }
    lines.push(`SUMMARY:${e.title.replace(/\n/g, '\\n')}`);
    if (e.description) lines.push(`DESCRIPTION:${e.description.replace(/\n/g, '\\n')}`);
    if (e.rrule) lines.push(e.rrule.startsWith('RRULE:') ? e.rrule : `RRULE:${e.rrule}`);
    for (const trigger of e.allDay ? ALL_DAY_REMINDERS : REMINDERS) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e.title.replace(/\n/g, '\\n')}`, `TRIGGER:${trigger}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(content: string, filename = 'tasks.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function gCalUrl(title: string, date: string, time: string, description: string, rrule?: string) {
  const pad2  = (n: number) => String(n).padStart(2, '0');
  const [h, m] = time.split(':').map(Number);
  const endH  = pad2((h + 1) % 24);
  const dt    = date.replace(/-/g, '');
  const start = `${dt}T${pad2(h)}${pad2(m)}00`;
  const end   = `${dt}T${endH}${pad2(m)}00`;
  let url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text='  + encodeURIComponent(title)
    + '&dates=' + start + '/' + end
    + '&details=' + encodeURIComponent(description);
  if (rrule) url += '&recur=' + encodeURIComponent(rrule.startsWith('RRULE:') ? rrule : `RRULE:${rrule}`);
  return url;
}
