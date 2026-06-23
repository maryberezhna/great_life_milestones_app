import { google } from 'googleapis';
import { createAdminClient } from './supabase/admin';
import { decrypt, encrypt } from './crypto';

function createOAuth2() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
  );
}

export async function getGoogleClientForUser(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('google_calendar_credentials')
    .select('refresh_token_encrypted')
    .eq('user_id', userId)
    .single();

  if (error || !data) throw new Error('Google Calendar not connected');

  const refreshToken = decrypt(data.refresh_token_encrypted);
  const oauth2 = createOAuth2();
  oauth2.setCredentials({ refresh_token: refreshToken });

  // Rotate token if Google issues a new refresh token
  oauth2.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await admin
        .from('google_calendar_credentials')
        .update({ refresh_token_encrypted: encrypt(tokens.refresh_token), updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }
  });

  return oauth2;
}

export async function saveGoogleCredentials(userId: string, refreshToken: string, scope: string) {
  const admin = createAdminClient();
  await admin.from('google_calendar_credentials').upsert({
    user_id: userId,
    refresh_token_encrypted: encrypt(refreshToken),
    scope,
    updated_at: new Date().toISOString(),
  });
}
