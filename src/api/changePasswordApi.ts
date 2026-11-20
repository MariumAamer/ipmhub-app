/* eslint-disable prettier/prettier */
/**
 * changePasswordApi.ts — "Change password" for email + password users.
 *
 * There is no dedicated change-password endpoint, and the existing
 * POST /wp/v2/users/me {password} call does NOT check the current password.
 * So the current password is verified first by asking the JWT plugin for a
 * token with it (POST /jwt-auth/v1/token) — that call has no side effects and
 * nothing is stored — and only then is the new password written.
 *
 * If Robby adds a real endpoint (current_password + new_password, and ideally
 * a "sign out other devices" flag), swap it in here; the screen only calls
 * changePassword() and reacts to the error code below.
 *
 * Error contract with the screen:
 *   err.code === 'wrong_password'  → show the red "Incorrect password" state
 *   anything else                  → generic message under the buttons
 */
import {getCachedCredentials} from './credentialsCache';
import {loginUser} from './authApi';

const BASE_URL = 'https://hub.instituteprojectmanagement.com/wp-json';

const stripHtml = (msg: string) =>
  msg.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const wrongPasswordError = () =>
  Object.assign(new Error('Incorrect password.'), {code: 'wrong_password'});

// Resolves if `password` is the account's current password. Throws a
// 'wrong_password' error if the server rejects it, any other Error if the
// check itself couldn't be completed (offline, 5xx, ...).
const verifyCurrentPassword = async (
  identity: string,
  password: string,
): Promise<void> => {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/jwt-auth/v1/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username: identity, password}),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok && data?.token) return;

  const code = String(data?.code || '');
  if (
    res.status === 401 ||
    res.status === 403 ||
    /incorrect_password|invalid_username|invalid_email|invalid_credentials/i.test(code)
  ) {
    throw wrongPasswordError();
  }
  throw new Error('Something went wrong. Please try again.');
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const creds = await getCachedCredentials();
  const stored = creds ? JSON.parse(creds.password) : null;
  const token: string | undefined = stored?.token;
  const identity: string | undefined = stored?.email;
  if (!token || !identity) throw new Error('You need to be signed in to change your password.');

  await verifyCurrentPassword(identity, currentPassword);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/wp/v2/users/me`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({password: newPassword}),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(stripHtml(err?.message || 'Could not update your password.'));
  }

  // Keep the stored session fresh with the new credentials. Best effort — the
  // password is already changed, so a failure here must not look like one.
  try {
    await loginUser(identity, newPassword);
  } catch {}
};
