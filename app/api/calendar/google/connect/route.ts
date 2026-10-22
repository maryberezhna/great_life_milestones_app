import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createOAuth2, isGoogleConfigured, CALENDAR_SCOPE } from '@/lib/google';

// «Календар» → «Підключити Google»: send her to Google's consent screen once.
// offline + consent → Google returns a refresh token, which only the server keeps.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${origin}/calendar?google=not_configured`);
  }
  const state = randomBytes(16).toString('hex');
  const url = createOAuth2(`${origin}/api/calendar/google/callback`).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [CALENDAR_SCOPE],
    state,
  });
  const res = NextResponse.redirect(url);
  res.cookies.set('gcal_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/calendar/google' });
  return res;
}
