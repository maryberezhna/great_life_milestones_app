import { google } from 'googleapis';
import { createAdminClient } from './supabase/admin';
import { decrypt, encrypt } from './crypto';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function createOAuth2(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri,
  );
}

// everything Google push needs on the server: OAuth client, token encryption, service role
export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    && process.env.TOKEN_ENCRYPTION_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function hasGoogleCredentials(userId: string): Promise<boolean> {
  if (!isGoogleConfigured()) return false;
  const { count } = await createAdminClient()
    .from('google_calendar_credentials')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

export async function deleteGoogleCredentials(userId: string): Promise<void> {
  if (!isGoogleConfigured()) return;
  await createAdminClient().from('google_calendar_credentials').delete().eq('user_id', userId);
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
