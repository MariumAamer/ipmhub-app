import * as Keychain from 'react-native-keychain';

// Keychain reads go through the native bridge (and, on Android, the Keystore),
// which is slow — and every API helper in the app was doing one per request,
// so a single screen load could trigger a dozen of them before any network
// call even started. This keeps the default-service credentials in memory
// after the first read. The cache is only ever populated with a real
// credentials object (never with "no creds"), and is invalidated on login and
// logout (see authApi.ts), so it can't serve a stale or signed-out token.

type Creds = {username: string; password: string};

let cached: Creds | null = null;
let inflight: Promise<Creds | null> | null = null;

export const getCachedCredentials = async (): Promise<Creds | null> => {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const creds = await Keychain.getGenericPassword();
      if (creds && creds.password) {
        cached = {username: creds.username, password: creds.password};
        return cached;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
};

export const invalidateCredentialsCache = (): void => {
  cached = null;
  inflight = null;
};
