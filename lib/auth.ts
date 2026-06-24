import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const DEV_USER_ID = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c';

export async function getRequiredUserId(): Promise<string> {
  // In local development, fall back to the seeded dev user
  if (process.env.NODE_ENV === 'development') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? DEV_USER_ID;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user.id;
}
