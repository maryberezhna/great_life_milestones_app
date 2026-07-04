// Single-user personal app — all data belongs to this user ID
const APP_USER_ID = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c';

export async function getRequiredUserId(): Promise<string> {
  return APP_USER_ID;
}
