/* eslint-disable prettier/prettier */
import {AppState, Linking} from 'react-native';

/**
 * Opens the LinkedIn auth URL in the system browser via Linking (no native
 * module, so no dependency on react-native-inappbrowser-reborn / "No activity")
 * and resolves with the ipmhub://linkedin-callback?code=... URL once Robby's
 * bounce page hands control back to the app.
 *
 * Resolves null if the user comes back to the app without completing sign-in
 * (cancelled) or nothing happens within 5 minutes. Rejects if the URL can't
 * be opened at all.
 */
export const openLinkedInAuth = (
  authUrl: string,
  appRedirect: string,
): Promise<string | null> =>
  new Promise((resolve, reject) => {
    let done = false;
    let sawBackground = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let overallTimer: ReturnType<typeof setTimeout> | null = null;

    const urlSub = Linking.addEventListener('url', ({url}) => {
      if (url.startsWith(appRedirect)) finish(url);
    });

    // Cancel detection: the app went to the background (browser opened) and
    // came back. Short grace window because the deep-link 'url' event can land
    // just after AppState flips to 'active'.
    const appSub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        sawBackground = true;
        if (graceTimer) {
          clearTimeout(graceTimer);
          graceTimer = null;
        }
      } else if (state === 'active' && sawBackground && !done) {
        graceTimer = setTimeout(() => finish(null), 1500);
      }
    });

    function cleanup() {
      done = true;
      if (graceTimer) clearTimeout(graceTimer);
      if (overallTimer) clearTimeout(overallTimer);
      urlSub.remove();
      appSub.remove();
    }

    function finish(value: string | null) {
      if (done) return;
      cleanup();
      resolve(value);
    }

    overallTimer = setTimeout(() => finish(null), 5 * 60 * 1000);

    Linking.openURL(authUrl).catch(err => {
      if (done) return;
      cleanup();
      reject(err);
    });
  });

// ─── Re-confirm with LinkedIn (account deletion) ─────────────────────────────
// Same OAuth app and redirects as the Sign In screen. The code is NOT
// exchanged here: the server swaps it for a token and checks the LinkedIn
// email matches the Hub account (POST /account/deletion {code, redirect_uri}).
const LINKEDIN_CLIENT_ID = '86aeqmka1c4bj1';
export const LINKEDIN_REDIRECT_URI =
  'https://hub.instituteprojectmanagement.com/linkedin-callback-app';
const LINKEDIN_APP_REDIRECT = 'ipmhub://linkedin-callback';
const LINKEDIN_AUTH_URL =
  `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
  `&client_id=${LINKEDIN_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}` +
  `&scope=openid%20profile%20email`;

/** Resolves {code, redirectUri}, or null if the member cancelled. Throws if LinkedIn returned no code. */
export const requestLinkedInCode = async (): Promise<{
  code: string;
  redirectUri: string;
} | null> => {
  const url = await openLinkedInAuth(LINKEDIN_AUTH_URL, LINKEDIN_APP_REDIRECT);
  if (!url) return null;
  const match = url.match(/[?&]code=([^&]+)/);
  if (!match) throw new Error('LinkedIn confirmation was not completed.');
  return {code: decodeURIComponent(match[1]), redirectUri: LINKEDIN_REDIRECT_URI};
};
