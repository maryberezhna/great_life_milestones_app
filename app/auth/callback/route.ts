import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveGoogleCredentials } from '@/lib/google';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // provider_refresh_token is only available here, right after exchange
  const refreshToken = data.session.provider_refresh_token;
  if (refreshToken) {
    const scope = data.session.provider_token
      ? 'https://www.googleapis.com/auth/calendar.events'
      : '';
    try {
      await saveGoogleCredentials(data.session.user.id, refreshToken, scope);
    } catch {
      // Non-fatal — user is still logged in, calendar just won't work
      console.error('[auth/callback] Failed to save Google credentials');
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
