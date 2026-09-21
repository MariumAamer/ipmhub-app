/* eslint-disable prettier/prettier */
/**
 * pushNotifications.ts — Firebase Cloud Messaging setup for Android + iOS.
 *
 * Handles:
 *  - Requesting notification permission (Android 13+ runtime permission,
 *    iOS permission via messaging().requestPermission())
 *  - Getting the FCM device token
 *  - Listening for token refresh
 *  - Foreground / background / quit-state message handling
 *  - Routing event-type data messages to Notifee for Register/Dismiss
 *    action buttons (see eventNotifications.ts) — plain message/mention/
 *    forum-reply notifications still use the default OS display via FCM's
 *    "notification" payload, unchanged.
 *
 * NOTE(Marium, updated 2026-08): register-device endpoint CONFIRMED by
 * Robby via Postman:
 *   POST /wp-json/custom/v1/notifications/register-device
 *   { "token": "<FCM_TOKEN>", "platform": "android", "provider": "fcm",
 *     "device_id": "<optional-stable-uuid>" }
 *   -> { "registered": true, "firebase_configured": true, "device_count": 1 }
 * device_id is optional per Robby's spec, but sending a stable one lets
 * the backend tell "same device, token rotated" apart from "new device"
 * for device_count purposes — generated once and persisted via Keychain
 * under a separate service key so it doesn't collide with the login
 * credentials entry in apiClient.ts.
 *
 * setBackgroundMessageHandler() MUST be called outside of any component
 * lifecycle — call registerBackgroundHandler() once, as early as possible,
 * from index.js (before AppRegistry.registerComponent). This is a hard
 * Firebase requirement, not a style choice — putting it inside App.tsx or
 * a screen component will cause background messages to be silently missed.
 * The same applies to registerNotifeeBackgroundHandler() in
 * eventNotifications.ts — both get called from index.js.
 *
 * IMPORTANT for Robby: event notifications must be sent as DATA-ONLY FCM
 * messages (data payload, no top-level "notification" key) — see the
 * header comment in eventNotifications.ts for why and the expected shape.
 */

import {Platform, PermissionsAndroid} from 'react-native';
import * as Keychain from 'react-native-keychain';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {getToken} from './apiClient';
import {displayEventNotification} from './eventNotifications';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';
const DEVICE_ID_SERVICE = 'ipmhub_device_id';

// ─── Stable device_id, generated once and persisted in Keychain ──────────────
// Uses a distinct Keychain "service" so this never collides with the login
// credentials entry (which stores {token, userId} under the default
// service — see getToken() in apiClient.ts).
const generateUuidV4 = (): string => {
  // Non-cryptographic UUID v4 — fine for a device identifier, no extra
  // dependency needed. crypto.getRandomValues isn't reliably available in
  // Hermes without a polyfill, so this sticks to plain Math.random.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

let cachedDeviceId: string | null = null;

const getOrCreateDeviceId = async (): Promise<string> => {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const existing = await Keychain.getGenericPassword({service: DEVICE_ID_SERVICE});
    if (existing && existing.password) {
      cachedDeviceId = existing.password;
      return cachedDeviceId;
    }
  } catch {
    // No existing entry — fall through to generate one.
  }
  const newId = generateUuidV4();
  try {
    await Keychain.setGenericPassword('device_id', newId, {service: DEVICE_ID_SERVICE});
  } catch (err) {
    console.log('[push] failed to persist device_id, using in-memory only:', err);
  }
  cachedDeviceId = newId;
  return newId;
};

// ─── Permission request ─────────────────────────────────────────────────────
// Android 13+ (API 33+) needs an explicit runtime permission request.
// Below API 33, notifications work without asking. iOS permission is
// handled separately by messaging().requestPermission() further down.
const requestAndroidPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 33) return true;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

// iOS permission via Firebase Messaging's own API — covers the native
// alert/badge/sound prompt. On Android this resolves true without
// prompting (Firebase's iOS-specific permission flow is a no-op there).
const requestIosPermission = async (): Promise<boolean> => {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// ─── Token registration with backend ────────────────────────────────────────
// Field shape confirmed by Robby — see file header.
export const registerPushToken = async (fcmToken: string): Promise<boolean> => {
  try {
    const authToken = await getToken();
    const deviceId = await getOrCreateDeviceId();
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const res = await fetch(`${BASE}/custom/v1/notifications/register-device`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        token: fcmToken,
        platform: Platform.OS, // 'ios' | 'android'
        provider: 'fcm',
        device_id: deviceId,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.registered) {
      console.log('[push] register-device failed:', res.status, data);
      return false;
    }
    console.log('[push] device registered:', data);
    return true;
  } catch (err) {
    console.log('[push] registerPushToken error:', err);
    return false;
  }
};

export const unregisterPushToken = async (fcmToken: string): Promise<boolean> => {
  try {
    const authToken = await getToken();
    const deviceId = await getOrCreateDeviceId();
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const res = await fetch(`${BASE}/custom/v1/notifications/unregister-device`, {
      method: 'POST',
      headers,
      body: JSON.stringify({token: fcmToken, provider: 'fcm', device_id: deviceId}),
    });
    return res.ok;
  } catch (err) {
    console.log('[push] unregisterPushToken error:', err);
    return false;
  }
};

// ─── Main entry point: call this from NotificationPermissionModal's onAllow ──
export const requestUserPermissionAndRegister = async (): Promise<string | null> => {
  const androidOk = await requestAndroidPermission();
  const iosOk = await requestIosPermission();

  if (!androidOk || !iosOk) {
    console.log('[push] permission denied');
    return null;
  }

  try {
    const fcmToken = await messaging().getToken();
    console.log('[push] FCM token:', fcmToken);
    await registerPushToken(fcmToken);
    return fcmToken;
  } catch (err) {
    console.log('[push] getToken error:', err);
    return null;
  }
};

// ─── Token refresh listener ──────────────────────────────────────────────────
// FCM tokens can rotate (app reinstall, restore, token expiry). Call this
// once on app start (e.g. in App.tsx's top-level useEffect) to keep the
// backend's stored token in sync. Returns the unsubscribe function.
export const listenForTokenRefresh = (): (() => void) => {
  return messaging().onTokenRefresh(async newToken => {
    console.log('[push] token refreshed:', newToken);
    await registerPushToken(newToken);
  });
};

// ─── Shared routing: event-type data messages go to Notifee, everything ──────
// else is left to the OS default display (already handled by FCM's own
// "notification" payload — no action needed on our side for those).
const routeIfEventMessage = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): Promise<boolean> => {
  const data = remoteMessage?.data;
  if (data?.type !== 'event') return false;
  await displayEventNotification({
    event_id: String(data.event_id ?? ''),
    wp_event_id: String(data.wp_event_id ?? ''),
    title: typeof data.title === 'string' ? data.title : undefined,
    body: typeof data.body === 'string' ? data.body : undefined,
    image: typeof data.image === 'string' ? data.image : undefined,
  });
  return true;
};

// ─── Foreground message handler ──────────────────────────────────────────────
// FCM does NOT auto-display a system notification while the app is in the
// foreground on either platform — you have to show something yourself
// (in-app banner/toast) or the user sees nothing at all. Call this once
// from App.tsx's top-level useEffect. Returns the unsubscribe function.
export const listenForForegroundMessages = (
  onMessageReceived: (message: FirebaseMessagingTypes.RemoteMessage) => void,
): (() => void) => {
  return messaging().onMessage(async remoteMessage => {
    console.log('[push] foreground message:', remoteMessage);
    const handledAsEvent = await routeIfEventMessage(remoteMessage);
    if (!handledAsEvent) {
      onMessageReceived(remoteMessage);
    }
  });
};

// ─── Background message handler ──────────────────────────────────────────────
// MUST be registered outside the React component tree, as early as
// possible — call this once from index.js, NOT from App.tsx. This is a
// hard Firebase requirement: registering it later or inside a component
// means background/killed-state messages get silently dropped.
export const registerBackgroundHandler = (): void => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[push] background message:', remoteMessage);
    await routeIfEventMessage(remoteMessage);
    // Plain (non-event) data-only pushes, if any come up later, would be
    // handled here too. Notification-type messages are shown by the OS
    // automatically and never reach this handler's data-only branch.
  });
};

// ─── Quit-state tap handler ───────────────────────────────────────────────────
// When the app was fully closed and the user taps a notification to open
// it, this is how you find out what they tapped. Call from App.tsx on
// mount; returns null if the app wasn't opened via a notification tap.
export const getInitialNotification =
  async (): Promise<FirebaseMessagingTypes.RemoteMessage | null> => {
    return messaging().getInitialNotification();
  };

// ─── Background/killed-state tap handler (app already running in bg) ─────────
// Distinct from getInitialNotification — this fires when the app was in
// the background (not fully killed) and the user taps a notification.
// Call from App.tsx's top-level useEffect. Returns the unsubscribe function.
export const listenForNotificationOpenedApp = (
  onNotificationOpened: (message: FirebaseMessagingTypes.RemoteMessage) => void,
): (() => void) => {
  return messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('[push] notification opened app from background:', remoteMessage);
    onNotificationOpened(remoteMessage);
  });
};
