/* eslint-disable prettier/prettier */
/**
 * changeEmailApi.ts — "Change email" with a confirmation link.
 *
 * Uses BuddyBoss's own Account Settings → "Login Information" endpoint, which
 * already does exactly what the design describes: it requires the current
 * password, does NOT change the email straight away, stores the new address as
 * `pending_email_change` user meta and emails a verification link. The current
 * email keeps working until the link is used.
 *
 * !! CONTRACT TAKEN FROM BUDDYBOSS SOURCE, NOT YET CONFIRMED AGAINST THE LIVE
 * !! SITE. Per the Postman-first rule, verify before relying on it:
 *     POST {BASE}/buddyboss/v1/account-settings/general
 *     Authorization: Bearer <jwt>
 *     { "fields": { "current_password": "...", "account_email": "new@x.com" } }
 *   Response: { error: false | { <feedback_key>: "message" }, notices, data }
 *   Feedback keys: pass_error (wrong current password), email_taken,
 *   email_invalid, email_blocked, email_empty, nochange.
 * If the route / field names differ, only requestEmailChange() needs to change.
 *
 * Error contract with the screen: err.code is one of EmailChangeErrorCode.
 *
 * Pending state: the settings endpoint doesn't give us a reliable "what is
 * pending" read, so the address we just requested is remembered on the device
 * (AsyncStorage) for the Login Information tab to show. It is tied to the
 * account email it was requested from and is dropped as soon as the account's
 * email equals it (i.e. the link was confirmed).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getCachedCredentials} from './credentialsCache';

const BASE_URL = 'https://hub.instituteprojectmanagement.com/wp-json';
const PENDING_KEY = 'ipm.pendingEmailChange';

export type EmailChangeErrorCode =
  | 'wrong_password'
  | 'email_taken'
  | 'email_invalid'
  | 'email_blocked'
  | 'email_empty'
  | 'nochange'
  | 'unknown';

const makeError = (code: EmailChangeErrorCode, message: string) =>
  Object.assign(new Error(message), {code});

const stripHtml = (msg: string) =>
  msg.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const KEY_TO_CODE: Record<string, EmailChangeErrorCode> = {
  pass_error: 'wrong_password',
  email_taken: 'email_taken',
  email_invalid: 'email_invalid',
  email_blocked: 'email_blocked',
  email_empty: 'email_empty',
  nochange: 'nochange',
};

// Matches BuddyBoss's feedback strings, in case `error` arrives as plain text.
const MESSAGE_PATTERNS: Array<[RegExp, EmailChangeErrorCode]> = [
  [/current password is invalid/i, 'wrong_password'],
  [/already taken/i, 'email_taken'],
  [/invalid/i, 'email_invalid'],
  [/currently unavailable/i, 'email_blocked'],
  [/cannot be empty/i, 'email_empty'],
  [/no changes were made/i, 'nochange'],
];

const classify = (error: unknown): EmailChangeErrorCode => {
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    for (const key of Object.keys(error as Record<string, unknown>)) {
      if (KEY_TO_CODE[key]) return KEY_TO_CODE[key];
    }
  }
  const text = Array.isArray(error)
    ? error.join(' ')
    : typeof error === 'string'
    ? error
    : error && typeof error === 'object'
    ? Object.values(error as Record<string, unknown>).join(' ')
    : '';
  for (const [re, code] of MESSAGE_PATTERNS) {
    if (re.test(text)) return code;
  }
  return 'unknown';
};

// Asks BuddyBoss to send a confirmation link to `newEmail`. Resolves when the
// link has been sent; otherwise throws an Error whose `.code` says why.
export const requestEmailChange = async (
  newEmail: string,
  currentPassword: string,
): Promise<void> => {
  const creds = await getCachedCredentials();
  const token: string | undefined = creds ? JSON.parse(creds.password)?.token : undefined;
  if (!token) throw makeError('unknown', 'You need to be signed in to change your email.');

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/buddyboss/v1/account-settings/general`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        fields: {current_password: currentPassword, account_email: newEmail.trim()},
      }),
    });
  } catch {
    throw makeError('unknown', 'Could not reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw makeError('unknown', stripHtml(data?.message || 'Could not send the confirmation link.'));
  }
  if (data?.error) {
    const code = classify(data.error);
    throw makeError(code, code === 'unknown' ? 'Could not send the confirmation link.' : code);
  }
};

// ─── Pending email (device-side) ──────────────────────────────────────────────
export const savePendingEmail = async (currentEmail: string, pendingEmail: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      PENDING_KEY,
      JSON.stringify({forEmail: currentEmail.trim().toLowerCase(), pending: pendingEmail.trim()}),
    );
  } catch {}
};

// The pending address for this account, or null. Clears the record once the
// account's email has become the pending one (link confirmed).
export const loadPendingEmail = async (currentEmail: string): Promise<string | null> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    const current = currentEmail.trim().toLowerCase();
    if (!rec?.pending) return null;
    if (String(rec.pending).toLowerCase() === current) {
      await AsyncStorage.removeItem(PENDING_KEY);
      return null;
    }
    return rec.forEmail === current ? String(rec.pending) : null;
  } catch {
    return null;
  }
};
