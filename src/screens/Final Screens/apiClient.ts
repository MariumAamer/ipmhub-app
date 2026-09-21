import * as Keychain from 'react-native-keychain';

export const BASE_URL = 'https://hub.instituteprojectmanagement.com/wp-json';

export const API = {
  // Auth
  LOGIN: `${BASE_URL}/jwt-auth/v1/token`,
  VALIDATE_TOKEN: `${BASE_URL}/jwt-auth/v1/token/validate`,
  ME: `${BASE_URL}/buddyboss/v1/members/me`,
  REGISTER: `${BASE_URL}/wp/v2/users`,
  FORGOT_PASSWORD: `${BASE_URL}/octopus/v1/forgot-password`,

  // Activity (Feed)
  ACTIVITY: `${BASE_URL}/buddyboss/v1/activity`,
  // Confirmed via Postman: POST .../activity/{id}/favorite (not /emotion,
  // which is BuddyBoss's separate Reactions feature and never touches the
  // favorite_count/favorited fields the app actually displays).
  ACTIVITY_LIKE: (id: number) =>
    `${BASE_URL}/buddyboss/v1/activity/${id}/favorite`,
  ACTIVITY_COMMENT: (id: number) =>
    `${BASE_URL}/buddyboss/v1/activity/${id}/comment`,
  ACTIVITY_COMMENTS: (id: number) =>
    `${BASE_URL}/buddyboss/v1/activity/${id}/comments`,

  // Members
  MEMBERS: `${BASE_URL}/buddyboss/v1/members`,
  MEMBER: (id: number) => `${BASE_URL}/buddyboss/v1/members/${id}`,
  // Confirmed via GET /wp-json/ route discovery: real one-way follow
  // endpoint is POST .../members/action/{id} with body {"action": "follow"
  // | "unfollow"} — a single member-actions route, not /friendship (which
  // 404s as rest_no_route) or /follow (never confirmed, also likely 404s).
  FOLLOW_MEMBER: (id: number) =>
    `${BASE_URL}/buddyboss/v1/members/action/${id}`,

  // Forums
  FORUMS: `${BASE_URL}/buddyboss/v1/forums`,
  TOPICS: `${BASE_URL}/buddyboss/v1/topics`,
  REPLIES: `${BASE_URL}/buddyboss/v1/replies`,

  // Notifications
  NOTIFICATIONS: `${BASE_URL}/buddyboss/v1/notifications`,
  NOTIFICATION: (id: number) => `${BASE_URL}/buddyboss/v1/notifications/${id}`,

  // Media
  MEDIA: `${BASE_URL}/buddyboss/v1/media`,

  // LearnDash
  COURSES: `${BASE_URL}/ldlms/v2/sfwd-courses`,
  COURSE: (id: number) => `${BASE_URL}/ldlms/v2/sfwd-courses/${id}`,
  USER_COURSES: (userId: number) =>
    `${BASE_URL}/ldlms/v2/users/${userId}/courses`,
  COURSE_PROGRESS: (userId: number) =>
    `${BASE_URL}/ldlms/v2/users/${userId}/course-progress`,
  ENROL: (userId: number) =>
    `${BASE_URL}/ldlms/v2/users/${userId}/course-enroll`,
  CERTIFICATES: (userId: number) =>
    `${BASE_URL}/ldlms/v2/users/${userId}/certificates`,

  // WooCommerce
  PRODUCTS: `${BASE_URL}/wc/v3/products`,
  ORDERS: `${BASE_URL}/wc/v3/orders`,
};

export const getToken = async (): Promise<string | null> => {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds) return null;
    const user = JSON.parse(creds.password);
    return user?.token ?? null;
  } catch {
    return null;
  }
};

export const apiRequest = async (
  url: string,
  method: string = 'GET',
  body?: any,
): Promise<any> => {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
  };
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (response.status === 403 || response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  // Was previously only throwing on 401/403 — every other failure (404s,
  // validation errors, 500s) returned the error body as if it were a
  // normal successful response. Any caller doing try { await apiRequest(...)
  // } catch { revert } never actually caught real failures, which is why
  // actions could silently "succeed" in the UI while doing nothing server-
  // side. Confirmed case: POST .../members/{id}/friendship returns 404
  // rest_no_route but was never caught anywhere calling apiRequest.
  if (!response.ok) {
    const message =
      (data && (data.message || data.code)) || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
};

export const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#034;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
