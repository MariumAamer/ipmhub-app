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
