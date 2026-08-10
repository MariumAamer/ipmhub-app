/* eslint-disable prettier/prettier */
import * as Keychain from 'react-native-keychain';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json/buddyboss/v1';

async function getToken(): Promise<string> {
  const creds = await Keychain.getGenericPassword();
  if (!creds) throw new Error('UNAUTHORIZED');
  const stored = JSON.parse(creds.password);
  return stored.token ?? creds.password;
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DMRecipient {
  user_id: number;
  name: string;
  user_avatars: { full: string; thumb: string };
  is_deleted: number;
}

export interface DMThread {
  id: number;
  unread_count: number;
  date: string;          // last message date
  current_user: number;
  last_sender_id: number;
  recipients: Record<string, DMRecipient>;
  avatar: Array<{ full: string; thumb: string }>;
  excerpt: { rendered: string };
  last_message_preview?: string;
}

export interface DMMessage {
  id: number;
  thread_id: number;
  sender_id: number;
  message: { raw: string; rendered: string };
  date_sent: string;
  display_date: string;
  sender_data: {
    sender_name: string;
    user_avatars: { full: string; thumb: string };
  };
  bp_media_ids: any[] | null;
  bp_videos: any[] | null;
  bp_documents: any[] | null;
  media_gif: any | null;
}

export interface DMThreadDetail {
  id: number;
  current_user: number;
  messages: DMMessage[];
  recipients: Record<string, DMRecipient>;
  can_send_message: boolean;
  message_per_page: number;
  next_messages_timestamp: string;
}

export interface MemberSearchResult {
  id: number;
  name: string;
  avatar_urls: { thumb: string; full: string };
  member_types?: string[];
  xprofile?: any;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getThreadList(page = 1): Promise<DMThread[]> {
  return authFetch(`/messages?per_page=20&page=${page}`);
}

export async function getThreadDetail(
  threadId: number,
  page = 1,
): Promise<DMThreadDetail> {
  return authFetch(`/messages/${threadId}?message_per_page=20&page=${page}`);
}

export async function sendMessage(
  threadId: number | null,
  recipientIds: number[],
  message: string,
): Promise<any> {
  const body: any = {
    message,
    recipients: recipientIds,
  };
  if (threadId) {
    body.thread_id = threadId;
  }
  console.log('SEND MESSAGE BODY:', JSON.stringify(body));
  const token = await getToken();
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log('SEND MESSAGE RESPONSE:', JSON.stringify(json));
  if (!res.ok) throw new Error(json?.message ?? 'Send failed');
  return json;
}

export async function markThreadRead(threadId: number): Promise<any> {
  return authFetch(`/messages/${threadId}`, {
    method: 'PATCH',
    body: JSON.stringify({ read: true }),
  });
}

export async function deleteThread(threadId: number): Promise<any> {
  return authFetch(`/messages/${threadId}`, { method: 'DELETE' });
}

export async function deleteMessages(
  threadId: number,
  messageIds: number[],
): Promise<any> {
  return authFetch(`/messages/${threadId}`, {
    method: 'DELETE',
    body: JSON.stringify({ message_ids: messageIds }),
  });
}

export async function searchMembers(query: string): Promise<MemberSearchResult[]> {
  return authFetch(
    `/members?search=${encodeURIComponent(query)}&per_page=20&xprofile=1`,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Given a thread and the current user id, return the other participant */
export function getOtherRecipient(
  thread: DMThread | DMThreadDetail,
  currentUserId: number,
): DMRecipient | null {
  const entries = Object.values(thread.recipients);
  // Prefer non-deleted, non-self recipient
  return (
    entries.find(r => r.user_id !== currentUserId && !r.is_deleted) ??
    entries.find(r => r.user_id !== currentUserId) ??
    null
  );
}



/** Format date_sent → "Jul 16" for thread list */
export function formatThreadDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Format date_sent → "12:03 pm" */
export function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Group messages by date for separator rendering */
export function groupMessagesByDate(
  messages: DMMessage[],
): Array<{ type: 'date'; label: string } | { type: 'message'; data: DMMessage }> {
  const result: Array<
    { type: 'date'; label: string } | { type: 'message'; data: DMMessage }
  > = [];
  let lastDate = '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const msg of messages) {
    const d = new Date(msg.date_sent);
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));

    let label: string;
    if (diffDays === 0) {
      label = 'Today';
    } else if (diffDays === 1) {
      label = 'Yesterday';
    } else if (diffDays < 7) {
      label = d.toLocaleDateString('en-US', {weekday: 'long'});
    } else {
      label = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    }

    if (label !== lastDate) {
      result.push({ type: 'date', label });
      lastDate = label;
    }
    result.push({ type: 'message', data: msg });
  }
  return result;
}

/** Get full name from member profile xprofile fields */
export async function getFullName(userId: number): Promise<string | null> {
  try {
    const data = await authFetch(`/members/${userId}?xprofile=1`);
    const groups = data?.xprofile?.groups;
    if (!groups) return data?.name ?? null;
    const allFields = Object.values(groups as any).flatMap(
      (g: any) => Object.values(g.fields ?? {}) as any[],
    );
    const firstName = allFields.find((f: any) => f.id === 1)?.value?.raw ?? '';
    const lastName = allFields.find((f: any) => f.id === 2)?.value?.raw ?? '';
    const full = `${firstName} ${lastName}`.trim();
    return full || data?.name || null;
  } catch {
    return null;
  }
}

/** Strip HTML tags from rendered message */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}
