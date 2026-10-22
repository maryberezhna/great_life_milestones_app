import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2, saveGoogleCredentials, CALENDAR_SCOPE } from '@/lib/google';
import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const back = (status: string) => {
    const res = NextResponse.redirect(`${origin}/calendar?google=${status}`);
    res.cookies.delete({ name: 'gcal_state', path: '/api/calendar/google' });
    return res;
  };

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code || !state || state !== request.cookies.get('gcal_state')?.value) return back('error');

  try {
    const oauth2 = createOAuth2(`${origin}/api/calendar/google/callback`);
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) return back('error');

    const userId = await getRequiredUserId();
    await saveGoogleCredentials(userId, tokens.refresh_token, tokens.scope ?? CALENDAR_SCOPE);

    // remember the choice — from now on «Додати в календар» goes to Google
    const supabase = await createClient();
    await supabase
      .from('calendar_settings')
      .upsert({ user_id: userId, provider: 'google', connected_at: new Date().toISOString() });
    return back('connected');
  } catch {
    console.error('[calendar/google/callback] token exchange failed');
    return back('error');
  }
}
