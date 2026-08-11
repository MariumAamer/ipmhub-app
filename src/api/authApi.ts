/* eslint-disable prettier/prettier */
import * as Keychain from 'react-native-keychain';

const BASE_URL = 'https://hub.instituteprojectmanagement.com/wp-json';

export interface AuthUser {
  token: string;
  email: string;
  displayName: string;
  username: string;
  userId?: number;
  avatar?: string;
}

// Strip HTML tags from server messages. Replaces tags with a space (not
// empty string) and collapses repeated whitespace — needed because some
// Profile Builder error messages embed tags directly against text with no
// space, e.g. "<strong>ERROR:</strong>Invalid key!", which would otherwise
// collapse into "ERROR:Invalid key!" with no space after the colon.
const clean = (msg: string) =>
  msg
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const saveUser = async (user: AuthUser) => {
  await Keychain.setGenericPassword(user.email, JSON.stringify(user));
};

// ─── Hermes-safe base64 decode (atob not available in React Native) ───────────
const b64decode = (str: string): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  const s = str.replace(/[^A-Za-z0-9+/=]/g, '');
  for (let i = 0; i < s.length; ) {
    const e1 = chars.indexOf(s[i++]),
      e2 = chars.indexOf(s[i++]);
    const e3 = chars.indexOf(s[i++]),
      e4 = chars.indexOf(s[i++]);
    const c1 = (e1 << 2) | (e2 >> 4);
    const c2 = ((e2 & 15) << 4) | (e3 >> 2);
    const c3 = ((e3 & 3) << 6) | e4;
    output += String.fromCharCode(c1);
    if (e3 !== 64) output += String.fromCharCode(c2);
    if (e4 !== 64) output += String.fromCharCode(c3);
  }
  return output;
};

// ─── Extract userId from JWT ───────────────────────────────────────────────────
const extractUserIdFromToken = (token: string): number => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    // Correct padding: need (4 - len%4) % 4 '=' chars to align to a
    // multiple of 4. The previous formula ('=='.slice(len%4 || 4)) produced
    // ZERO padding for the two most common cases (len%4 === 2 or 3), which
    // let the manual decode loop run one group past the real data and
    // append a garbage trailing byte — silently breaking JSON.parse and
    // making extractUserIdFromToken fall into its catch block, returning 0
    // even though the token was perfectly valid.
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(b64decode(padded));
    return Number(payload?.data?.user?.id) || 0;
  } catch {
    return 0;
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginUser = async (
  email: string,
  password: string,
): Promise<AuthUser> => {
  const response = await fetch(`${BASE_URL}/jwt-auth/v1/token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username: email, password}),
  });
  const data = await response.json();
  if (!response.ok || data.code)
    throw new Error(clean(data.message || 'Login failed'));

  const userId = extractUserIdFromToken(data.token);

  const user: AuthUser = {
    token: data.token,
    email: data.user_email,
    displayName: data.user_display_name,
    username: data.user_nicename,
    userId,
  };
  await saveUser(user);
  return user;
};

// ─── Register ─────────────────────────────────────────────────────────────────
export const registerUser = async (
  username: string,
  email: string,
  password: string,
  name: string,
): Promise<any> => {
  const response = await fetch(`${BASE_URL}/ipm/v1/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_login: username,
      email,
      password,
      display_name: name,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.code || !data.success)
    throw new Error(clean(data.message || 'Registration failed'));

  // Auto-login after registration so token + userId get stored
  try {
    await loginUser(email, password);
  } catch {}
  return data;
};

// ─── Social login response → AuthUser ──────────────────────────────────────────
// Confirmed live response shape (Postman test, 2026-08-07) for
// /custom/v1/social-login/linkedin — and expected consistent for
// /custom/v1/social-login/google since both share the same backend family:
//   { token, user_id, user_email, user_nicename, user_display_name,
//     is_new_user, provider }
// Richer than Robby's original description (which only listed token,
// user_id, user_email, is_new_user, provider) — confirmed via live response,
// so we use user_display_name / user_nicename directly when present. Falls
// back to /wp/v2/users/me (same endpoint Robby's own step 4 verifies the JWT
// with), then to the email prefix, only if those fields are ever absent —
// e.g. in case Google's response shape differs from LinkedIn's.
const fetchProfileFields = async (
  token: string,
): Promise<{displayName: string; username: string} | null> => {
  try {
    const res = await fetch(`${BASE_URL}/wp/v2/users/me`, {
      headers: {Authorization: `Bearer ${token}`},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      displayName: data?.name || '',
      username: data?.slug || '',
    };
  } catch {
    return null;
  }
};

const buildSocialAuthUser = async (data: any): Promise<AuthUser> => {
  const email = data.user_email || '';
  const emailPrefix = email.split('@')[0] || '';

  let displayName = data.user_display_name || '';
  let username = data.user_nicename || '';

  if (!displayName || !username) {
    const profile = await fetchProfileFields(data.token);
    displayName = displayName || profile?.displayName || emailPrefix;
    username = username || profile?.username || emailPrefix;
  }

  const user: AuthUser = {
    token: data.token,
    email,
    displayName,
    username,
    userId: data.user_id || extractUserIdFromToken(data.token),
  };
  await saveUser(user);
  return user;
};

// ─── Social Login — Google ────────────────────────────────────────────────────
// Confirmed live endpoint (Robby, 2026-08-06): POST /custom/v1/social-login/google
// Body: { id_token: "<Google idToken>" }
export const googleSocialLogin = async (idToken: string): Promise<AuthUser> => {
  const response = await fetch(`${BASE_URL}/custom/v1/social-login/google`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id_token: idToken}),
  });
  const data = await response.json();
  if (!response.ok || data.code)
    throw new Error(clean(data.message || 'Google login failed'));

  return buildSocialAuthUser(data);
};

// ─── Social Login — LinkedIn ──────────────────────────────────────────────────
// Confirmed live endpoint (Robby, 2026-08-06): POST /custom/v1/social-login/linkedin
// Body: { code: "<LinkedIn auth code>", redirect_uri: "<same URI used in the
// authorization request>" }. This is now a SINGLE call — the backend does the
// code→access_token exchange with LinkedIn itself (client secret stays
// server-side), so there is no separate /ipm/v1/linkedin-token step anymore.
// redirect_uri must match exactly what was sent to LinkedIn's /authorization
// endpoint — kept in sync with LINKEDIN_REDIRECT in SignInScreen/SignUpScreen.
export const linkedInSocialLogin = async (
  authCode: string,
): Promise<AuthUser> => {
  const response = await fetch(`${BASE_URL}/custom/v1/social-login/linkedin`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      code: authCode,
      redirect_uri:
        // Path changed 2026-08-08 (Robby): now /linkedin-callback-app — his
        // new bounce-page path with the tappable "Continue to IPM Hub App"
        // button. Must stay in sync with LINKEDIN_REDIRECT in
        // SignInScreen.tsx / SignUpScreen.tsx.
        'https://hub.instituteprojectmanagement.com/linkedin-callback-app',
    }),
  });
  const data = await response.json();
  if (!response.ok || data.code)
    throw new Error(clean(data.message || 'LinkedIn login failed'));

  return buildSocialAuthUser(data);
};

// ─── Backward compat alias ────────────────────────────────────────────────────
export const socialLogin = async (
  provider: 'google' | 'linkedin',
  token: string,
): Promise<AuthUser> => {
  if (provider === 'google') return googleSocialLogin(token);
  return linkedInSocialLogin(token);
};

// ─── Forgot Password / Reset Password (Profile Builder plugin) ───────────────
// This site uses the Profile Builder plugin's own recover-password flow at
// /lost-password/, NOT a custom REST endpoint and NOT vanilla
// wp-login.php?action=lostpassword. Both confirmed against live server
// responses on 2026-06-19 (real test account, both success and error paths).
//
// Mechanics: Profile Builder requires a per-page-load nonce for both the
// request form and the reset form, and neither step has a JSON API — both
// are classic HTML form POSTs that re-render the same page with a success
// or error message embedded in the markup. So each function here does a
// GET first to scrape the current nonce out of the HTML, then POSTs back
// with it attached.

const LOST_PASSWORD_URL = 'https://hub.instituteprojectmanagement.com/lost-password/';

// Step 1 form — confirmed live markup:
// <form method="post" id="wppb-recover-password" action=".../lost-password/">
//   <input name="username_email" type="text" />
//   <input name="action" type="hidden" value="recover_password" />
//   <input name="password_recovery_nonce_field" type="hidden" value="<nonce>" />
//   <input name="_wp_http_referer" type="hidden" value="/lost-password/" />
// </form>
// Success: <p class="wppb-success">Check your email for the password reset link.</p>
// Error:   <p class="wppb-warning">The email address entered wasn't found in the database!<br>...</p>
export const forgotPassword = async (usernameOrEmail: string): Promise<void> => {
  const getResponse = await fetch(LOST_PASSWORD_URL, {method: 'GET'});
  const getHtml = await getResponse.text();

  const nonceMatch = getHtml.match(
    /id="password_recovery_nonce_field"\s+name="password_recovery_nonce_field"\s+value="([^"]+)"/,
  );
  if (!nonceMatch) {
    throw new Error('Could not start password reset. Please try again.');
  }
  const nonce = nonceMatch[1];

  const body =
    `username_email=${encodeURIComponent(usernameOrEmail)}` +
    `&recover_password=${encodeURIComponent('Get Reset Link')}` +
    `&action=recover_password` +
    `&password_recovery_nonce_field=${encodeURIComponent(nonce)}` +
    `&_wp_http_referer=${encodeURIComponent('/lost-password/')}`;

  const postResponse = await fetch(LOST_PASSWORD_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });
  if (!postResponse.ok) {
    throw new Error('Something went wrong. Please try again.');
  }
  const postHtml = await postResponse.text();

  if (postHtml.includes('class="wppb-success"')) {
    return;
  }

  const errorMatch = postHtml.match(/class="wppb-warning">([\s\S]*?)<\/p>/);
  if (errorMatch) {
    throw new Error(clean(errorMatch[1].replace(/<br\s*\/?>/gi, ' ')));
  }

  throw new Error('Something went wrong. Please try again.');
};

// Step 2 form — reached via the deep-linked reset email
// (ipmhub://reset-password?key=...&login=...). Confirmed live markup:
// <form method="post" id="wppb-recover-password"
//       action=".../lost-password/?key=...&login=...">
//   <input name="passw1" type="password" />
//   <input name="userData" type="hidden" value="<numeric user id>" />
//   <input name="passw2" type="password" />
//   <input name="action2" type="hidden" value="recover_password2" />
//   <input name="key" type="hidden" />
//   <input name="login" type="hidden" />
//   <input name="password_recovery_nonce_field2" type="hidden" value="<nonce>" />
//   <input name="_wp_http_referer" type="hidden" value="/lost-password/?key=...&login=..." />
// </form>
// Note the "2" suffix on field/action names — this second-stage form uses
// different names than the request form above, confirmed from live markup.
// Three states now CONFIRMED live (2026-06-19):
//   Success:  <p class="wppb-success">Your password has been successfully changed!</p>
//   Mismatch: <p class="wppb-error">The entered passwords don't match!</p>
//             (renders twice in the markup, same text both times — the
//             form is also still present in this case)
//   Invalid/expired key: <p class="wppb-error"><strong>ERROR:</strong>Invalid key!</p>
//             (this one comes back on the initial GET — the form itself
//             is never rendered at all, since Profile Builder won't even
//             show the reset form for a bad key)
// All three confirmed states use "wppb-error", not "wppb-warning" — that
// class only showed up on the *first* form (the email-request step).
export const resetPassword = async (
  key: string,
  login: string,
  newPassword: string,
): Promise<void> => {
  const url = `${LOST_PASSWORD_URL}?key=${encodeURIComponent(key)}&login=${encodeURIComponent(login)}`;

  const getResponse = await fetch(url, {method: 'GET'});
  const getHtml = await getResponse.text();

  // Confirmed live: an invalid/expired key never renders the form at all —
  // Profile Builder shows just the wppb-error message instead. Check for
  // that before assuming the form is present.
  const getErrorMatch = getHtml.match(/class="wppb-error">([\s\S]*?)<\/p>/);
  if (getErrorMatch) {
    throw new Error(clean(getErrorMatch[1]));
  }

  const nonceMatch = getHtml.match(
    /id="password_recovery_nonce_field2"\s+name="password_recovery_nonce_field2"\s+value="([^"]+)"/,
  );
  const userDataMatch = getHtml.match(/name="userData"\s+value="([^"]+)"/);
  if (!nonceMatch || !userDataMatch) {
    throw new Error('This reset link may have expired. Please request a new one.');
  }
  const nonce = nonceMatch[1];
  const userData = userDataMatch[1];

  const body =
    `passw1=${encodeURIComponent(newPassword)}` +
    `&userData=${encodeURIComponent(userData)}` +
    `&passw2=${encodeURIComponent(newPassword)}` +
    `&recover_password2=${encodeURIComponent('Reset Password')}` +
    `&action2=recover_password2` +
    `&key=${encodeURIComponent(key)}` +
    `&login=${encodeURIComponent(login)}` +
    `&password_recovery_nonce_field2=${encodeURIComponent(nonce)}` +
    `&_wp_http_referer=${encodeURIComponent(`/lost-password/?key=${key}&login=${login}`)}`;

  const postResponse = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });
  if (!postResponse.ok) {
    throw new Error('Something went wrong. Please try again.');
  }
  const postHtml = await postResponse.text();

  if (postHtml.includes('class="wppb-success"')) {
    return;
  }

  // Matches the first occurrence only — confirmed sufficient since in the
  // one case where it renders twice (password mismatch), both instances
  // are identical text.
  const errorMatch = postHtml.match(/class="wppb-error">([\s\S]*?)<\/p>/);
  if (errorMatch) {
    throw new Error(clean(errorMatch[1]));
  }

  throw new Error('This reset link may have expired. Please request a new one.');
};

// ─── New-user detection (server-side, cross-device) ───────────────────────────
// Replaces the old Keychain-based "first login" flag, which only worked on the
// device that originally logged in and broke on reinstall / new device.
// Instead we ask BuddyBoss whether this user has a Job Title (xProfile field
// 1097) set. ProfileSetup is the only place that field gets written, so an
// empty value reliably means "hasn't completed onboarding yet" — regardless
// of which device or how many times they've installed the app.
//
// Response shape confirmed live: data.xprofile.groups[groupKey].fields[fieldKey]
// with fields keyed by numeric field ID (string), value at field.value.raw.
const JOB_TITLE_FIELD_ID = '1097';

export const isNewUser = async (
  userId: number,
  token: string,
): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/buddyboss/v1/members/${userId}`, {
      headers: {Authorization: `Bearer ${token}`},
    });
    if (!res.ok) return true; // can't confirm → safer to treat as new
    const data = await res.json();
    const groups = data?.xprofile?.groups;
    if (!groups || typeof groups !== 'object') return true;

    for (const groupKey of Object.keys(groups)) {
      const fields = groups[groupKey]?.fields;
      if (!fields || typeof fields !== 'object') continue;
      const jobTitleField = fields[JOB_TITLE_FIELD_ID];
      const raw = jobTitleField?.value?.raw;
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return false; // Job Title is set → returning, onboarded user
      }
    }
    return true; // field never found with a value → new user
  } catch {
    return true; // network failure → safer to treat as new than skip onboarding
  }
};

// ─── Single post-auth routing decision ─────────────────────────────────────────
// Used after EVERY successful auth path (email/password, Google, LinkedIn) so
// the Welcome → ProfileSetup flow only ever shows for genuinely new users,
// consistently, regardless of how they signed in or which device they're on.
export const getPostAuthRoute = async (
  user: AuthUser,
): Promise<'Welcome' | 'MainApp'> => {
  if (!user.userId || !user.token) return 'MainApp';
  const fresh = await isNewUser(user.userId, user.token);
  return fresh ? 'Welcome' : 'MainApp';
};

// ─── Token helpers ────────────────────────────────────────────────────────────
export const getStoredUser = async (): Promise<AuthUser | null> => {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds?.password) return null;
    return JSON.parse(creds.password) as AuthUser;
  } catch {
    return null;
  }
};

export const getToken = async (): Promise<string | null> => {
  const user = await getStoredUser();
  return user?.token ?? null;
};

export const logoutUser = async (): Promise<void> => {
  await Keychain.resetGenericPassword();
};

export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/jwt-auth/v1/token/validate`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`},
    });
    const data = await res.json();
    return data?.data?.status === 200;
  } catch {
    return false;
  }
};
