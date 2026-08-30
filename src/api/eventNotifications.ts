/* eslint-disable prettier/prettier */
/**
 * eventNotifications.ts — Notifee layer for event push notifications with
 * Register / Dismiss action buttons (per Figma spec, lock-screen mockup
 * shared 2026-08).
 *
 * Why Notifee and not plain FCM: bare FCM "notification" messages render
 * via the OS default template on both platforms and don't support custom
 * action buttons. Notifee sits on top of Firebase Messaging and gives full
 * control over the notification's buttons/actions, on both Android and
 * iOS, entirely from JS — including iOS notification categories, which
 * would otherwise need a native UNNotificationCategory registered in
 * AppDelegate.mm. That native step is NOT needed with Notifee — relevant
 * given the Windows/no-Xcode constraint on this machine.
 *
 * IMPORTANT for Robby (backend): event notifications MUST be sent as
 * DATA-ONLY FCM messages (a "data" payload, no top-level "notification"
 * key). If a "notification" key is present, the OS auto-displays its own
 * plain notification (no buttons) in background/quit state before our
 * code ever runs, and the Register/Dismiss buttons never appear.
 *
 * Expected data payload shape for event notifications:
 *   {
 *     type: 'event',
 *     event_id: '<zoho event id>',   // matches EventRegistrationPayload.event_id in eventsApi.ts
 *     wp_event_id: '<local wp id>',  // used for markEventRegistered() / navigation
 *     title: 'UPCOMING EVENT: ...',
 *     body: '...',
 *     image: 'https://...'           // optional, shown as large icon
 *   }
 * Field names are a proposal — confirm against whatever Robby actually
 * sends via Postman before relying on them, per usual process.
 */

import notifee, {
  AndroidImportance,
  EventType,
  AndroidCategory,
} from '@notifee/react-native';
import {registerForEvent, getStoredUserFields, markEventRegistered} from './eventsApi';

const EVENTS_CHANNEL_ID = 'events';
const REGISTER_ACTION_ID = 'register';
const DISMISS_ACTION_ID = 'dismiss';
const EVENT_CATEGORY_ID = 'event_reminder';

// ─── One-time setup — call once on app start (App.tsx top-level effect) ──────
export const setupEventNotifications = async (): Promise<void> => {
  // Android notification channel — separate from the "default" FCM channel
  // set in AndroidManifest.xml so events can carry action buttons and a
  // distinct importance level without affecting plain message/mention
  // notifications.
  await notifee.createChannel({
    id: EVENTS_CHANNEL_ID,
    name: 'Events & webinars',
    importance: AndroidImportance.HIGH,
  });

  // iOS action category — this is the JS equivalent of registering a
  // UNNotificationCategory natively. No AppDelegate.mm edit needed.
  await notifee.setNotificationCategories([
    {
      id: EVENT_CATEGORY_ID,
      actions: [
        {id: REGISTER_ACTION_ID, title: 'Register'},
        {id: DISMISS_ACTION_ID, title: 'Dismiss'},
      ],
    },
  ]);
};

// ─── Display an event notification with Register/Dismiss buttons ─────────────
export const displayEventNotification = async (data: {
  event_id?: string;
  wp_event_id?: string;
  title?: string;
  body?: string;
  image?: string;
}): Promise<void> => {
  await notifee.displayNotification({
    title: data.title ?? 'Upcoming event',
    body: data.body ?? '',
    data: {
      event_id: data.event_id ?? '',
      wp_event_id: data.wp_event_id ?? '',
    },
    android: {
      channelId: EVENTS_CHANNEL_ID,
      category: AndroidCategory.EVENT,
      smallIcon: 'ic_notification', // must exist as a monochrome drawable — see AndroidManifest notes
      largeIcon: data.image || undefined,
      pressAction: {id: 'default'},
      actions: [
        {title: 'Register', pressAction: {id: REGISTER_ACTION_ID}},
        {title: 'Dismiss', pressAction: {id: DISMISS_ACTION_ID}},
      ],
    },
    ios: {
      categoryId: EVENT_CATEGORY_ID,
      attachments: data.image ? [{url: data.image}] : undefined,
    },
  });
};

// ─── Shared action handler (used by both foreground and background events) ───
// Runs the actual registration using the same registerForEvent() flow as
// EventDetailScreen — pulls the user's stored profile fields, submits, and
// marks the event registered locally so the UI reflects it next time the
// app opens.
const handleRegisterAction = async (eventId: string, wpEventId: string) => {
  if (!eventId) {
    console.log('[eventNotifications] register action fired with no event_id');
    return;
  }
  try {
    const fields = await getStoredUserFields();
    const result = await registerForEvent({
      first_name: fields.first_name ?? '',
      last_name: fields.last_name ?? '',
      email: fields.email ?? '',
      company: fields.company ?? '',
      job_title: fields.job_title ?? '',
      region: fields.region ?? '',
      event_id: eventId,
    });
    if (result.success && wpEventId) {
      await markEventRegistered(wpEventId);
    }
    console.log('[eventNotifications] register result:', result);
  } catch (err) {
    console.log('[eventNotifications] register action error:', err);
  }
};

// ─── Foreground action handler — call once from App.tsx top-level effect ─────
export const listenForNotifeeForegroundEvents = (): (() => void) => {
  return notifee.onForegroundEvent(({type, detail}) => {
    if (type !== EventType.ACTION_PRESS) return;
    const eventId = String(detail.notification?.data?.event_id ?? '');
    const wpEventId = String(detail.notification?.data?.wp_event_id ?? '');
    if (detail.pressAction?.id === REGISTER_ACTION_ID) {
      handleRegisterAction(eventId, wpEventId);
    }
    // DISMISS_ACTION_ID needs no extra work — Notifee removes the
    // notification from the tray automatically on any action press.
  });
};

// ─── Background action handler — call once from index.js, alongside the ──────
// Firebase background handler. Same hard requirement: must be registered
// outside the React component tree, before AppRegistry.registerComponent.
export const registerNotifeeBackgroundHandler = (): void => {
  notifee.onBackgroundEvent(async ({type, detail}) => {
    if (type !== EventType.ACTION_PRESS) return;
    const eventId = String(detail.notification?.data?.event_id ?? '');
    const wpEventId = String(detail.notification?.data?.wp_event_id ?? '');
    if (detail.pressAction?.id === REGISTER_ACTION_ID) {
      await handleRegisterAction(eventId, wpEventId);
    }
  });
};
