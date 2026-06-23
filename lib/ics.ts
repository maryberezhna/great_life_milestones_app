export interface IcsEvent {
  uid: string;
  title: string;
  date: string;       // YYYY-MM-DD
  time?: string;      // HH:MM, default '09:00'
  description?: string;
  rrule?: string;     // e.g. 'RRULE:FREQ=WEEKLY'
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
    const t = e.time ?? '09:00';
    const start = icsDateTime(e.date, t);
    const end   = icsDateTime(e.date, addHour(t));

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}@planning-app`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${e.title.replace(/\n/g, '\\n')}`);
    if (e.description) lines.push(`DESCRIPTION:${e.description.replace(/\n/g, '\\n')}`);
    if (e.rrule) lines.push(e.rrule.startsWith('RRULE:') ? e.rrule : `RRULE:${e.rrule}`);
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
