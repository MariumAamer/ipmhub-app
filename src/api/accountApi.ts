/* eslint-disable prettier/prettier */
/**
 * accountApi.ts — Login Information endpoints (custom/v1/account/*).
 *
 *   GET  /account/login-info
 *   POST /account/email          (send confirmation link to a new address)
 *   POST /account/email/resend
 *   POST /account/email/cancel
 *   POST /account/password
 *
 * CONFIRMED live (Postman, Nov 2026):
 *   - login-info response: {email, provider, can_change_email,
 *     can_change_password, pending_email, pending_expires, password_rules:
 *     {min_length, max_length, different_from_current, not_common},
 *     sign_out_others_default}
 *   - every error: {code, message, data: {status, field}}
 *       account_incorrect_password → 403, field "current"
 *       account_nothing_pending    → 400 (resend/cancel with nothing pending)
 *
 * Request field names, confirmed in Postman: POST /account/email takes
 * `new_email` + `current_password` (plain `email` is ignored and returns
 * account_bad_email). Still NOT confirmed: new_password / sign_out_others for
 * POST /account/password. They live in FIELDS below — fix them there only.
 * Also unconfirmed: how a social-login account with no password sets one.
 * Design D says "we'll ask you to confirm with Google", so setPassword() sends
 * the new password plus the provider proof: id_token for Google/Apple
 * (same names the delete-account endpoint uses). For LinkedIn the app only ever
 * gets an authorization `code` (the server does the token exchange), so it
 * sends code + redirect_uri, as /social-login/linkedin does. That needs the
 * backend to accept code + redirect_uri here too — agreed as "option 1",
 * to be confirmed with Robby/Aulia.
 */
import {getCachedCredentials} from './credentialsCache';
import {loginUser} from './authApi';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json/custom/v1/account';
const TIMEOUT_MS = 15000;

// Request body field names — single place to change.
// email + currentPassword confirmed; newPassword / signOutOthers still guesses.
const FIELDS = {
  email: 'new_email',
  currentPassword: 'current_password',
  newPassword: 'new_password',
  signOutOthers: 'sign_out_others',
  idToken: 'id_token',
  accessToken: 'access_token',
  code: 'code',
  redirectUri: 'redirect_uri',
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type PasswordRules = {
  minLength: number;
  maxLength: number;
  differentFromCurrent: boolean;
  notCommon: boolean;
};

export const DEFAULT_PASSWORD_RULES: PasswordRules = {
  minLength: 8,
  maxLength: 128,
  differentFromCurrent: true,
  notCommon: true,
};

export type LoginInfo = {
  email: string;
  provider: string; // "password" | social provider name
  canChangeEmail: boolean;
  canChangePassword: boolean;
  pendingEmail: string | null;
  pendingExpires: number;
  passwordRules: PasswordRules;
  signOutOthersDefault: boolean;
};

export type AccountErrorCode = 'wrong_password' | 'nothing_pending' | 'unauthorized' | 'unknown';
export type AccountError = Error & {code: AccountErrorCode; serverCode?: string; field?: string; status?: number};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const stripHtml = (msg: string) => msg.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const makeError = (
  code: AccountErrorCode,
  message: string,
  extra: {serverCode?: string; field?: string; status?: number} = {},
): AccountError => Object.assign(new Error(message), {code}, extra) as AccountError;

const SERVER_CODE_MAP: Record<string, AccountErrorCode> = {
  account_incorrect_password: 'wrong_password',
  account_nothing_pending: 'nothing_pending',
};

const getToken = async (): Promise<{token: string; identity?: string}> => {
  const creds = await getCachedCredentials();
  let stored: any = null;
  try {
    stored = creds ? JSON.parse(creds.password) : null;
  } catch {}
  if (!stored?.token) throw makeError('unauthorized', 'You need to be signed in.');
  return {token: stored.token, identity: stored.email};
};

const call = async (method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<any> => {
  const {token} = await getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? {'Content-Type': 'application/json'} : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    throw makeError(
      'unknown',
      e?.name === 'AbortError'
        ? 'Request timed out. Please check your connection.'
        : 'Could not reach the server. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const serverCode = data?.code ? String(data.code) : undefined;
    const code: AccountErrorCode =
      (serverCode && SERVER_CODE_MAP[serverCode]) ||
      (res.status === 401 || /jwt_auth/i.test(serverCode || '') ? 'unauthorized' : 'unknown');
    throw makeError(code, stripHtml(data?.message || 'Something went wrong. Please try again.'), {
      serverCode,
      field: data?.data?.field || undefined,
      status: res.status,
    });
  }
  return data;
};

// ─── Login info ───────────────────────────────────────────────────────────────
export const getLoginInfo = async (): Promise<LoginInfo> => {
  const d = await call('GET', '/login-info');
  const r = d?.password_rules || {};
  return {
    email: String(d?.email || ''),
    provider: String(d?.provider || 'password'),
    canChangeEmail: d?.can_change_email !== false,
    canChangePassword: d?.can_change_password !== false,
    pendingEmail: d?.pending_email ? String(d.pending_email) : null,
    pendingExpires: Number(d?.pending_expires) || 0,
    passwordRules: {
      minLength: Number(r.min_length) || DEFAULT_PASSWORD_RULES.minLength,
      maxLength: Number(r.max_length) || DEFAULT_PASSWORD_RULES.maxLength,
      differentFromCurrent: r.different_from_current !== false,
      notCommon: r.not_common !== false,
    },
    signOutOthersDefault: d?.sign_out_others_default !== false,
  };
};

// ─── Email ────────────────────────────────────────────────────────────────────
// Sends a confirmation link to `newEmail`. Throws AccountError: `.code`
// 'wrong_password' for a bad current password; otherwise `.field`/`.message`
// say what to show where.
export const requestEmailChange = async (newEmail: string, currentPassword: string): Promise<void> => {
  await call('POST', '/email', {
    [FIELDS.email]: newEmail.trim(),
    [FIELDS.currentPassword]: currentPassword,
  });
};

export const resendEmailChange = async (): Promise<void> => {
  await call('POST', '/email/resend', {});
};

export const cancelEmailChange = async (): Promise<void> => {
  await call('POST', '/email/cancel', {});
};

// ─── Password ─────────────────────────────────────────────────────────────────
const refreshSession = async (identity: string | undefined, newPassword: string) => {
  // Refresh the stored session with the new credentials. Best effort — the
  // password is already changed, so a failure here must not look like one.
  if (!identity) return;
  try {
    await loginUser(identity, newPassword);
  } catch {}
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  signOutOthers?: boolean,
): Promise<void> => {
  const {identity} = await getToken();
  await call('POST', '/password', {
    [FIELDS.currentPassword]: currentPassword,
    [FIELDS.newPassword]: newPassword,
    ...(signOutOthers !== undefined ? {[FIELDS.signOutOthers]: signOutOthers} : {}),
  });
  await refreshSession(identity, newPassword);
};

// Proof that the person owns the social account (the server asks for it
// instead of a current password).
export type SocialProof = {idToken?: string; accessToken?: string; code?: string; redirectUri?: string};

// "Set a password" for an account that signed up with Google/LinkedIn/Apple.
export const setPassword = async (newPassword: string, proof: SocialProof): Promise<void> => {
  const {identity} = await getToken();
  await call('POST', '/password', {
    [FIELDS.newPassword]: newPassword,
    ...(proof.idToken ? {[FIELDS.idToken]: proof.idToken} : {}),
    ...(proof.accessToken ? {[FIELDS.accessToken]: proof.accessToken} : {}),
    ...(proof.code ? {[FIELDS.code]: proof.code} : {}),
    ...(proof.redirectUri ? {[FIELDS.redirectUri]: proof.redirectUri} : {}),
  });
  await refreshSession(identity, newPassword);
};

// ═══════════════════════════════════════════════════════════════════════════════
// Delete Account · Blocked Members · BuddyBoss requests
//
// REBUILT 2026-11-19. These exports used to live in this file and were lost when
// the Login Information code replaced it. They were reconstructed from how
// ConfirmDeleteScreen, DeleteAccountScreen, deletionPrompt, useMemberBlock,
// AuthorOptionsSheet, FeedScreen and reportApi call them, and from the Postman
// results. If you have the original file in VS Code Timeline / Local History,
// compare against it.
//
// Confirmed:  GET /account/deletion shape · POST /blocked-members {user_id} ·
//             POST /blocked-members/post {activity_id}
// Guessed:    the response shapes of GET /blocked-members and the block calls
//             (parsed tolerantly), POST /account/deletion's response, and the
//             unblock verb (DELETE /blocked-members/{id}).
// ═══════════════════════════════════════════════════════════════════════════════
const SITE = 'https://hub.instituteprojectmanagement.com/wp-json';

export class AccountApiError extends Error {
  code: string;
  status: number;
  data: any;
  isSessionExpired: boolean;
  constructor(message: string, code = 'unknown', status = 0, data: any = null) {
    super(message);
    Object.setPrototypeOf(this, AccountApiError.prototype);
    this.name = 'AccountApiError';
    this.code = code;
    this.status = status;
    this.data = data;
    this.isSessionExpired = status === 401 || /jwt_auth/i.test(code);
  }
}

const SESSION_MSG = 'Your session has expired. Please sign in again.';

/** Authenticated JSON request against {SITE}{path}. Throws AccountApiError. */
const request = async (path: string, method = 'GET', body?: unknown): Promise<any> => {
  let token: string;
  try {
    token = (await getToken()).token;
  } catch {
    throw new AccountApiError(SESSION_MSG, 'unauthorized', 401);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${SITE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? {'Content-Type': 'application/json'} : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new AccountApiError(
      e?.name === 'AbortError'
        ? 'Request timed out. Please check your connection.'
        : 'Could not reach the server. Check your connection and try again.',
      'network',
    );
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AccountApiError(
      stripHtml(data?.message || 'Something went wrong. Please try again.'),
      data?.code ? String(data.code) : 'unknown',
      res.status,
      data?.data ?? null,
    );
  }
  return data;
};

/** BuddyBoss REST (/buddyboss/v1), e.g. bbRequest('/moderation/report'). */
export const bbRequest = (path: string, method = 'GET', body?: unknown): Promise<any> =>
  request(`/buddyboss/v1${path}`, method, body);

const custom = (path: string, method = 'GET', body?: unknown): Promise<any> =>
  request(`/custom/v1${path}`, method, body);

// ─── Delete account ───────────────────────────────────────────────────────────
export type DeletionStatus = {
  scheduled: boolean;
  due: number;
  dueLabel: string;
  provider: string;
  confirmWith: string[];
  graceDays: number;
  previewDue: number;
  previewDueLabel: string;
  canDelete: boolean;
  blockedReason: string;
};

/** 'scheduled' = deactivate with a restore window; 'now' = delete immediately. */
export type DeletionMode = 'scheduled' | 'now';

/** One of these, depending on GET /account/deletion → confirm_with. */
export type DeletionConfirmation = {
  password?: string;
  googleIdToken?: string;
  appleIdToken?: string;
  linkedInCode?: {code: string; redirectUri: string};
  emailCode?: string;
};

export const getDeletionStatus = async (): Promise<DeletionStatus> => {
  const d = await custom('/account/deletion');
  return {
    scheduled: !!d?.scheduled,
    due: Number(d?.due) || 0,
    dueLabel: String(d?.due_label || ''),
    provider: String(d?.provider || ''),
    confirmWith: Array.isArray(d?.confirm_with) ? d.confirm_with.map(String) : [],
    graceDays: Number(d?.grace_days) || 30,
    previewDue: Number(d?.preview_due) || 0,
    previewDueLabel: String(d?.preview_due_label || ''),
    canDelete: d?.can_delete !== false,
    blockedReason: String(d?.blocked_reason || ''),
  };
};

export const requestAccountDeletion = async (
  mode: DeletionMode,
  c: DeletionConfirmation,
): Promise<{signedOut: boolean; dueLabel: string}> => {
  const body: Record<string, unknown> = {mode, understand: true};
  if (c.password) body.password = c.password;
  if (c.googleIdToken) body[FIELDS.idToken] = c.googleIdToken;
  if (c.appleIdToken) body[FIELDS.idToken] = c.appleIdToken;
  if (c.linkedInCode) {
    body[FIELDS.code] = c.linkedInCode.code;
    body[FIELDS.redirectUri] = c.linkedInCode.redirectUri;
  }
  if (c.emailCode) body.email_code = c.emailCode;
  const d = await custom('/account/deletion', 'POST', body);
  return {
    // The server ends the session when deletion is accepted.
    signedOut: d?.signed_out !== false,
    dueLabel: String(d?.due_label || ''),
  };
};

export const sendDeletionCode = async (): Promise<void> => {
  await custom('/account/deletion/code', 'POST', {});
};

export const restoreAccount = async (): Promise<void> => {
  await custom('/account/deletion/restore', 'POST', {});
};

export const keepDeletion = async (): Promise<void> => {
  await custom('/account/deletion/keep', 'POST', {});
};

// ─── Blocked members ──────────────────────────────────────────────────────────
export type BlockedMemberInfo = {
  id: number;
  name: string;
  avatarUrl: string;
  canUnblock: boolean;
};

// Tolerant: the server may name these fields a few different ways.
const toBlockedMember = (m: any): BlockedMemberInfo => ({
  id: Number(m?.id ?? m?.user_id ?? m?.member_id ?? 0),
  name: String(m?.name ?? m?.display_name ?? m?.full_name ?? m?.user_login ?? ''),
  avatarUrl: String(
    m?.avatar_url ?? m?.avatar ?? m?.avatar_urls?.thumb ?? m?.avatar_urls?.full ?? '',
  ),
  canUnblock: m?.can_unblock !== false,
});

// The member the call acted on may be returned bare, or wrapped.
const unwrapMember = (d: any): any => d?.member ?? d?.user ?? d?.blocked ?? d?.data ?? d ?? {};

export const listBlockedMembers = async (): Promise<BlockedMemberInfo[]> => {
  const d = await custom('/blocked-members');
  const list = Array.isArray(d) ? d : d?.members ?? d?.blocked ?? d?.items ?? d?.data ?? [];
  return (Array.isArray(list) ? list : []).map(toBlockedMember).filter(m => m.id);
};

/** POST /blocked-members {user_id} */
export const blockMember = async (userId: number): Promise<BlockedMemberInfo> =>
  toBlockedMember(unwrapMember(await custom('/blocked-members', 'POST', {user_id: userId})));

/** POST /blocked-members/post {activity_id} — blocks that post's author. */
export const blockPostAuthor = async (activityId: number): Promise<BlockedMemberInfo> =>
  toBlockedMember(
    unwrapMember(await custom('/blocked-members/post', 'POST', {activity_id: activityId})),
  );

export const unblockMember = async (userId: number): Promise<void> => {
  await custom(`/blocked-members/${userId}`, 'DELETE');
};
