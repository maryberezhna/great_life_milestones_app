'use server';

import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';
import { getGoogleClientForUser, hasGoogleCredentials, isGoogleConfigured, deleteGoogleCredentials } from '@/lib/google';
import type { IcsEvent } from '@/lib/ics';

export type CalendarProvider = 'google' | 'apple';

export interface CalendarSettings {
  provider: CalendarProvider | null;  // null — not connected yet
  googleReady: boolean;               // Google keys are set on the server
}

export async function getCalendarSettings(): Promise<CalendarSettings> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from('calendar_settings')
    .select('provider')
    .eq('user_id', userId)
    .maybeSingle();
  let provider = (data?.provider ?? null) as CalendarProvider | null;
  // Google counts as connected only while its token is really there
  if (provider === 'google' && !(await hasGoogleCredentials(userId))) provider = null;
  return { provider, googleReady: isGoogleConfigured() };
}

// Apple / any other calendar is chosen right away; Google only after its consent screen
// (see /api/calendar/google/callback). null disconnects.
export async function setCalendarProvider(provider: 'apple' | null): Promise<void> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();
  if (provider === null) {
    await deleteGoogleCredentials(userId);
    const { error } = await supabase.from('calendar_settings').delete().eq('user_id', userId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase
    .from('calendar_settings')
    .upsert({ user_id: userId, provider, connected_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

function addHour(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Push-only: each step becomes (or updates) one event in the primary Google calendar.
// The event id comes from the step id, so adding the same step again updates it instead of doubling.
export async function addToGoogleCalendar(events: IcsEvent[], timeZone: string): Promise<number> {
  const userId = await getRequiredUserId();
  const auth = await getGoogleClientForUser(userId);
  const calendar = google.calendar({ version: 'v3', auth });
  const supabase = await createClient();

  let added = 0;
  for (const e of events) {
    const time = e.time ?? '09:00';
    const id = 'sphere' + e.uid.toLowerCase().replace(/[^a-v0-9]/g, '');
    const requestBody = {
      id,
      summary: e.title,
      description: e.description,
      start: { dateTime: `${e.date}T${time}:00`, timeZone },
      end:   { dateTime: `${e.date}T${addHour(time)}:00`, timeZone },
      recurrence: e.rrule ? [e.rrule.startsWith('RRULE:') ? e.rrule : `RRULE:${e.rrule}`] : undefined,
      // same reminders as the .ics file: 2 h and 1 h before
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 120 }, { method: 'popup', minutes: 60 }] },
    };
    try {
      await calendar.events.insert({ calendarId: 'primary', requestBody });
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code !== 409) throw err;
      await calendar.events.update({ calendarId: 'primary', eventId: id, requestBody });
    }
    await supabase.from('plan_tasks').update({ calendar_event_id: id }).eq('id', e.uid).eq('user_id', userId);
    added++;
  }
  return added;
}
