/* eslint-disable prettier/prettier */
import {getToken, stripHtml} from './apiClient';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── Auth headers ─────────────────────────────────────────────────────────────
const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AppNotification {
  id: number;
  componentName: string;
  componentAction: string;
  content: string;
  date: string;
  dateLabel: string;
  isNew: boolean;
  itemId: number;
  secondaryItemId: number | null;
  // CONFIRMED via Postman (2026-08-03): present directly on the
  // notification object as avatar_urls.thumb / avatar_urls.full.
  avatarUrl: string | null;
  // CONFIRMED via Postman — direct URL to the discussion for
  // "new_forum_topic" notifications. Empty string on some other action
  // types (e.g. bbp_new_reply in the sample data), so don't assume it's
  // always populated.
  linkUrl: string;
}

// Compact timestamp to match the Figma row spec (Body XS, "1h" / "5h" / "2d",
// no "ago" suffix) — distinct from formatDate() in apiClient, which is used
// elsewhere in the app and spells the unit out.
export const formatCompactDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  return date.toLocaleDateString('en-IE', {day: 'numeric', month: 'short'});
};

// BuddyBoss notification objects don't have a single confirmed content shape
// across component types — different actions (mentions, comments, follows,
// forum replies) have been seen with content under different keys depending
// on the site's registered notification callback. Try the common ones in
// order rather than guessing a single field; falls back to empty string
// (UI shows a generic label) rather than fabricating text.
const parseNotification = (n: any): AppNotification => {
  // CONFIRMED via Postman (2026-08-03): the real text lives at
  // description.rendered as an HTML anchor, e.g.
  // <a href="...">Kunashe started a new discussion: Title</a> — not under
  // "content" as originally guessed. Keeping content.rendered as a fallback
  // in case other component types (non-forums) shape it differently.
  const rawContent =
    n?.description?.rendered ??
    n?.content?.rendered ??
    (typeof n?.content === 'string' ? n.content : null) ??
    '';
  const rawDate = n?.date ?? n?.date_notified ?? n?.date_recorded ?? '';
  return {
    id: n?.id,
    componentName: n?.component ?? n?.component_name ?? '',
    componentAction: n?.action ?? n?.component_action ?? '',
    content: stripHtml(typeof rawContent === 'string' ? rawContent : ''),
    date: rawDate,
    dateLabel: formatCompactDate(rawDate),
    isNew: n?.is_new === 1 || n?.is_new === '1' || n?.is_new === true || n?.unread === true,
    itemId: n?.item_id ?? 0,
    secondaryItemId: n?.secondary_item_id ?? null,
    // CONFIRMED: avatar_urls.thumb/full is present directly on the
    // notification object — no separate member lookup needed.
    avatarUrl: n?.avatar_urls?.thumb ?? n?.avatar_urls?.full ?? null,
    linkUrl: n?.link_url ?? '',
  };
};

// ─── Fetch notifications ──────────────────────────────────────────────────────
export type NotificationFilter = 'all' | 'unread' | 'read';

export const getNotifications = async (
  filter: NotificationFilter = 'all',
  page = 1,
  perPage = 20,
): Promise<{items: AppNotification[]; hasMore: boolean}> => {
  const headers = await authHeaders();
  let url = `${BASE}/buddyboss/v1/notifications?per_page=${perPage}&page=${page}`;
  if (filter === 'unread') url += '&is_new=true';
  if (filter === 'read') url += '&is_new=false';
  const res = await fetch(url, {headers});
  if (!res.ok) return {items: [], hasMore: false};
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return {items: [], hasMore: false};
  return {
    items: data.map(parseNotification),
    hasMore: data.length === perPage,
  };
};

// ─── Single notification actions ──────────────────────────────────────────────
export const markNotificationRead = async (id: number): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/custom/v1/notifications/${id}/read`, {
    method: 'POST',
    headers,
  });
  return res.ok;
};

export const markNotificationUnread = async (id: number): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/custom/v1/notifications/${id}/unread`, {
    method: 'POST',
    headers,
  });
  return res.ok;
};

export const deleteNotification = async (id: number): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/custom/v1/notifications/${id}/delete`, {
    method: 'POST',
    headers,
  });
  return res.ok;
};

// ─── Bulk notification actions ────────────────────────────────────────────────
const bulkAction = async (
  action: 'bulk-read' | 'bulk-unread' | 'bulk-delete',
  ids: number[],
  all = false,
): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/custom/v1/notifications/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ids, all}),
  });
  return res.ok;
};

export const bulkMarkRead = (ids: number[], all = false) =>
  bulkAction('bulk-read', ids, all);
export const bulkMarkUnread = (ids: number[], all = false) =>
  bulkAction('bulk-unread', ids, all);
export const bulkDeleteNotifications = (ids: number[], all = false) =>
  bulkAction('bulk-delete', ids, all);

// ─── Notification settings ────────────────────────────────────────────────────
// Confirmed field keys (per Robby, 2026-08-02). Base key = mobile/push
// channel; "_web" suffix = web channel; the intro-reply group is the one
// exception with an "_email" suffix instead of "_web". Send "yes"/"no"
// strings, not booleans — matches the payload shape Robby's endpoint expects.
export type NotifSettingValue = 'yes' | 'no';
export type NotificationSettingsMap = Record<string, NotifSettingValue>;

export const NOTIFICATION_SETTING_KEYS = {
  enableAll: 'enable_notification',
  enableAllWeb: 'enable_notification_web',
  mention: 'bb_new_mention',
  mentionWeb: 'bb_new_mention_web',
  activityComment: 'bb_activity_comment',
  activityCommentWeb: 'bb_activity_comment_web',
  newFollower: 'bb_following_new',
  newFollowerWeb: 'bb_following_new_web',
  replyIntro: 'n_reply_intro',
  replyIntroEmail: 'n_reply_intro_email',
  newDiscussion: 'new_discussion',
  forumReply: 'bb_forums_subscribed_reply',
  feedLike: 'n_feed_like',
} as const;

export const getNotificationSettings =
  async (): Promise<NotificationSettingsMap> => {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/custom/v1/notifications/settings`, {
      headers,
    });
    if (!res.ok) return {};
    const data = await res.json().catch(() => null);
    return data?.settings ?? data ?? {};
  };

// Send only what changed, or the full map — either is accepted per spec.
export const updateNotificationSettings = async (
  settings: Partial<NotificationSettingsMap>,
): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/custom/v1/notifications/settings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({settings}),
  });
  return res.ok;
};
