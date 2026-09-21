/* eslint-disable prettier/prettier */
import {
  getToken,
  stripHtml,
  formatDate,
  countryFlag,
  getMemberProfile,
  getMembersBatch,
  resolveFullName,
} from './feedApi';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── Auth headers ─────────────────────────────────────────────────────────────
const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// ─── Upload media (photo/video/document) for a discussion or reply ──────────
// Reuses the exact same /buddyboss/v1/media endpoint + FormData pattern
// already proven working for Feed photo uploads in CreatePostScreen.tsx.
// Returns the uploaded media's id, to be passed into createTopic()/postReply()
// as bbp_media / bbp_videos / bbp_documents (field names confirmed present
// on the topic JSON schema itself, seen empty/null on every topic fetched
// so far — this is the first time anything actually populates them).
export const uploadForumMedia = async (
  uri: string,
  filename: string,
  mimeType: string,
): Promise<number | null> => {
  const token = await getToken();
  if (!token) return null;
  try {
    const formData = new FormData();
    formData.append('file', {uri, type: mimeType, name: filename} as any);
    formData.append('upload_privacy', 'public');
    const res = await fetch(`${BASE}/buddyboss/v1/media`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`},
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ?? null;
  } catch {
    return null;
  }
};

// ─── Base64 decode (pure JS — never use atob, unsupported on Hermes/RN) ──────
const b64decode = (input: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  str = str.replace(/[^A-Za-z0-9+/=]/g, '');
  for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ) {
    buffer = chars.indexOf(buffer);
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
};

// ─── Current user ID, decoded from the stored JWT payload ───────────────────
// There's no dedicated "whoami" call available; the user ID is embedded in
// the JWT's payload segment (standard `data.user.id` shape for this backend's
// auth plugin). Decode locally rather than adding a network round trip.
export const getCurrentUserId = async (): Promise<number | null> => {
  try {
    const token = await getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadJson = b64decode(parts[1]);
    const payload = JSON.parse(payloadJson);
    const id = payload?.data?.user?.id ?? payload?.id ?? payload?.user_id;
    return id ? parseInt(id, 10) : null;
  } catch {
    return null;
  }
};

// ─── Filter item type ─────────────────────────────────────────────────────────
export interface FilterItem {
  id: string; // slug, used as the stable React key + URL-safe value
  name: string;
  termId: number; // real WP topic-tag term ID, used for the API ?tag= query
  count: number;
}

// ─── Real topic-tag taxonomy, fetched live from /wp/v2/topic-tag?per_page=100 ──
// Verified against the live site on 2026-06-18. Excludes: the 9 Spanish-locale
// duplicate tags (380, 384, 379, 381, 383, 386, 385, 382, 374-zero-count), and
// "General Forum" (247) which is the default/untagged bucket, not a real
// filter category. Tag 365 ("& Consumer Goods", malformed name) is folded
// into "Retail & Consumer Goods" (260) per product decision.

export const INDUSTRY_FILTERS: FilterItem[] = [
  {id: 'aerospace-defense', name: 'Aerospace & Defense', termId: 248, count: 4},
  {id: 'construction-engineering', name: 'Construction & Engineering', termId: 249, count: 25},
  {id: 'education-research', name: 'Education & Research', termId: 250, count: 10},
  {id: 'energy-infrastructure', name: 'Energy & Infrastructure', termId: 252, count: 4},
  {id: 'financial-services', name: 'Financial Services', termId: 253, count: 17},
  {id: 'government-public-sector', name: 'Government & Public Sector', termId: 254, count: 13},
  {id: 'healthcare-pharmaceuticals', name: 'Healthcare & Pharmaceuticals', termId: 259, count: 6},
  {id: 'hospitality-tourism', name: 'Hospitality & Tourism', termId: 255, count: 4},
  {id: 'manufacturing-production', name: 'Manufacturing & Production', termId: 257, count: 6},
  {id: 'media-entertainment', name: 'Media & Entertainment', termId: 251, count: 5},
  {id: 'nonprofit-organisations', name: 'Nonprofit Organisations', termId: 258, count: 8},
  {id: 'real-estate-property', name: 'Real Estate & Property', termId: 261, count: 3},
  {id: 'retail', name: 'Retail', termId: 298, count: 4},
  // Includes tag 365 ("& Consumer Goods", malformed) merged into this entry
  {id: 'retail-consumer-goods', name: 'Retail & Consumer Goods', termId: 260, count: 6},
  {id: 'supply-chain-logistics', name: 'Supply Chain & Logistics', termId: 274, count: 2},
  {id: 'tech-telecom', name: 'Tech & Telecom', termId: 256, count: 13},
  {id: 'technology-telecommunications', name: 'Technology & Telecommunications', termId: 342, count: 13},
  {id: 'transportation-logistics', name: 'Transportation & Logistics', termId: 262, count: 4},
];

export const DEPARTMENT_FILTERS: FilterItem[] = [
  {id: 'business-strategy-development', name: 'Business Strategy & Development', termId: 263, count: 11},
  {id: 'finance-accounting', name: 'Finance & Accounting', termId: 264, count: 3},
  {id: 'human-resources', name: 'Human Resources', termId: 265, count: 10},
  {id: 'information-technology', name: 'Information Technology', termId: 266, count: 10},
  {id: 'legal-compliance', name: 'Legal & Compliance', termId: 267, count: 3},
  {id: 'marketing-communications', name: 'Marketing & Communications', termId: 268, count: 7},
  {id: 'operations-procurement', name: 'Operations & Procurement', termId: 269, count: 7},
  {id: 'project-management-office', name: 'Project Management Office', termId: 270, count: 25},
  {id: 'quality-assurance', name: 'Quality Assurance', termId: 271, count: 5},
  {id: 'quality-control', name: 'Quality Control', termId: 289, count: 8},
  {id: 'regulatory-compliance', name: 'Regulatory & Compliance', termId: 290, count: 6},
  {id: 'risk-management', name: 'Risk Management', termId: 293, count: 15},
  {id: 'stakeholder-management', name: 'Stakeholder Management', termId: 296, count: 13},
];

export const REGION_FILTERS: FilterItem[] = [
  {id: 'africa', name: 'Africa', termId: 372, count: 1},
  {id: 'asia-pacific', name: 'Asia-Pacific', termId: 375, count: 1},
  {id: 'europe', name: 'Europe', termId: 371, count: 1},
  // English populated tag only; Spanish dup (380) and zero-count dup (374) excluded
  {id: 'latin-america-caribbean', name: 'Latin America & Caribbean', termId: 380, count: 1},
  {id: 'middle-east-north-africa', name: 'Middle East & North Africa', termId: 373, count: 1},
  {id: 'north-america', name: 'North America', termId: 376, count: 1},
];

export const SOFTWARE_FILTERS: FilterItem[] = [
  {id: 'asana', name: 'Asana', termId: 275, count: 2},
  {id: 'basecamp', name: 'Basecamp', termId: 276, count: 2},
  {id: 'clickup', name: 'ClickUp', termId: 277, count: 4},
  {id: 'jira', name: 'Jira', termId: 278, count: 2},
  {id: 'microsoft-project', name: 'Microsoft Project', termId: 279, count: 5},
  {id: 'monday-com', name: 'Monday.com', termId: 280, count: 2},
  {id: 'other-software', name: 'Other Software', termId: 285, count: 3},
  {id: 'primavera-p6', name: 'Primavera P6', termId: 281, count: 1},
  {id: 'sap-project-system', name: 'SAP Project System', termId: 282, count: 1},
  {id: 'smartsheet', name: 'Smartsheet', termId: 314, count: 1},
  {id: 'trello', name: 'Trello', termId: 283, count: 3},
  {id: 'wrike', name: 'Wrike', termId: 284, count: 1},
];

export const CHALLENGES_FILTERS: FilterItem[] = [
  {id: 'agile-hybrid-approaches', name: 'Agile & Hybrid Approaches', termId: 367, count: 2},
  {id: 'ai-technology', name: 'AI & Technology', termId: 297, count: 29},
  {id: 'budget-cost-management', name: 'Budget & Cost Management', termId: 286, count: 12},
  {id: 'career-growth', name: 'Career & Growth', termId: 368, count: 10},
  {id: 'leadership-people', name: 'Leadership & People', termId: 369, count: 15},
  {id: 'project-challenges', name: 'Project Challenges', termId: 288, count: 7},
  {id: 'resistance-to-change', name: 'Resistance to Change', termId: 291, count: 4},
  {id: 'resource-management', name: 'Resource Management', termId: 292, count: 11},
  {id: 'sales-customer-service', name: 'Sales & Customer Service', termId: 273, count: 1},
  {id: 'sales-marketing', name: 'Sales & Marketing', termId: 299, count: 2},
  {id: 'schedule-time-management', name: 'Schedule & Time Management', termId: 294, count: 11},
  {id: 'scope-creep', name: 'Scope Creep', termId: 295, count: 5},
  {id: 'sustainability-integration', name: 'Sustainability Integration', termId: 366, count: 8},
];

export const ALL_FILTER = {id: 'all', name: 'All Forums', termId: 0, count: 0};

// ─── Category tabs ────────────────────────────────────────────────────────────
export const TABS = [
  {key: 'all', label: 'All Forums', filterKey: null as string | null},
  {key: 'industry', label: 'PM by Industry', filterKey: 'industry'},
  {key: 'department', label: 'PM by Department', filterKey: 'department'},
  {key: 'region', label: 'PM by Region', filterKey: 'region'},
  {key: 'software', label: 'PM Softwares', filterKey: 'software'},
  {key: 'challenges', label: 'Project Challenges', filterKey: 'challenges'},
];

export const FILTER_SETS: Record<string, FilterItem[]> = {
  industry: INDUSTRY_FILTERS,
  department: DEPARTMENT_FILTERS,
  region: REGION_FILTERS,
  software: SOFTWARE_FILTERS,
  challenges: CHALLENGES_FILTERS,
};

// ─── Member enrichment cache ──────────────────────────────────────────────────
// Author designation/country flag aren't in the topics endpoint — same gap as
// Feed's activity items. Cache by userId to avoid refetching for users who
// posted multiple topics in the same page of results.
const memberCache = new Map<number, {name: string; avatar: string; title: string; flag: string; country: string}>();

// Reads from memberCache only — no network call. Caller must have already
// run prefetchAuthors() for the batch of items being mapped, so this is a
// synchronous O(1) lookup, not an await-per-item like the old version.
const enrichAuthor = (userId: number, fallbackName: string, fallbackAvatar: string) => {
  if (!userId) {
    return {id: 0, name: fallbackName, avatar: fallbackAvatar, title: '', flag: '', country: ''};
  }
  if (memberCache.has(userId)) {
    const cached = memberCache.get(userId)!;
    return {id: userId, ...cached};
  }
  return {id: userId, name: fallbackName, avatar: fallbackAvatar, title: '', flag: '', country: ''};
};

// Fixes the N+1 pattern that made Forums slow to load: previously, every
// topic/reply on a page triggered its own individual getMemberProfile()
// call (up to 15 separate network round trips just to render one page of
// topics). Now: collect every unique author id across the whole batch of
// items, fetch them ALL in one request via getMembersBatch(), and populate
// memberCache once — turning "up to 15 requests" into "1 topics request +
// 1 batch member request" per screen load.
const prefetchAuthors = async (items: any[]) => {
  const idsToFetch = [
    ...new Set(items.map(item => item.author).filter((id: number) => id && !memberCache.has(id))),
  ] as number[];
  if (idsToFetch.length === 0) return;
  const members = await getMembersBatch(idsToFetch);
  members.forEach((member, userId) => {
    const groups = member?.xprofile?.groups?.['1']?.fields;
    const title = groups?.['1097']?.value?.raw || '';
    const country = groups?.['1099']?.value?.raw || '';
    memberCache.set(userId, {
      name: resolveFullName(member, 'IPM Member'),
      avatar: member.avatar_urls?.thumb || member.avatar_urls?.full || '',
      title,
      flag: countryFlag(country),
      country,
    });
  });
};

// ─── Topic type ────────────────────────────────────────────────────────────────
export interface ForumTopic {
  id: number;
  title: string;
  content: string;
  fullContent: string;
  truncated: boolean;
  forumId: number;
  forumName: string;
  tags: string[];
  replyCount: number;
  // "People involved" — bbPress's own participant count (author + everyone
  // who's replied), confirmed present as `voice_count` on the real
  // /buddyboss/v1/topics response (e.g. a topic with 1 reply from a second
  // person came back voice_count: 2). Not available on the Feed activity
  // endpoint's forum items — only here, on the topic itself.
  voiceCount: number;
  lastActiveTime: string;
  time: string;
  rawDate: string;
  isOwn: boolean;
  author: {
    id: number;
    name: string;
    avatar: string;
    title: string;
    flag: string;
    country: string;
  };
}

const mapTopic = (item: any, currentUserId: number | null): ForumTopic => {
  const rawContent = stripHtml(item.content?.rendered || item.content?.raw || '');
  const isLong = rawContent.length > 220;
  const embeddedUser = item._embedded?.user?.[0];

  const author = enrichAuthor(
    item.author,
    embeddedUser?.name || 'IPM Member',
    embeddedUser?.avatar_urls?.thumb ||
      `https://www.gravatar.com/avatar/${item.author}?s=96&d=identicon`,
  );

  const tags = (item.topic_tags || '')
    .split(',')
    .map((t: string) => stripHtml(t.trim()))
    .filter(Boolean);

  return {
    id: item.id,
    title: stripHtml(item.title?.rendered || item.title?.raw || ''),
    content: isLong ? rawContent.slice(0, 220) : rawContent,
    fullContent: rawContent,
    truncated: isLong,
    forumId: item.forum_id || item.parent || 0,
    forumName: item._embedded?.forum?.[0]?.title?.rendered || '',
    tags,
    replyCount: parseInt(item.total_reply_count, 10) || 0,
    voiceCount: parseInt(item.voice_count, 10) || 0,
    lastActiveTime: item.last_active_time || '',
    time: formatDate(item.date),
    rawDate: item.date,
    isOwn: currentUserId != null && item.author === currentUserId,
    author,
  };
};

// ─── Sort options ──────────────────────────────────────────────────────────────
// Verified against the live backend via Postman on 2026-07-09, then confirmed
// against the actual web forum's default display on the same date:
//   - 'popular' → orderby=popular&order=desc: WORKS (total_reply_count descends)
//   - 'newest'  → orderby=date&order=desc: WORKS (standard WP param)
//   - 'activity' → web's "Latest Activity" (its default sort) was compared
//     side-by-side against the topics data: it does NOT order by last-reply
//     time (topic 175688, more recently replied-to than 175690, appears
//     BELOW 175690 on web). Web's "Latest Activity" is actually just
//     newest-creation-date order — same underlying limitation as the
//     orderby=modified param we ruled out earlier (bbPress doesn't track
//     true last-reply time in a REST-sortable field on this backend). So
//     'activity' is intentionally aliased to the same orderby=date&order=desc
//     param as 'newest', to match what web actually does rather than what
//     its label implies. If a real last-reply sort key ever becomes
//     available on the backend, revisit this — the label promises something
//     the current implementation (and web's) doesn't deliver.
export type ForumSortBy = 'activity' | 'newest' | 'popular';

// ─── GET topics list, with optional search/tag filter/sort ──────────────────
export const getTopics = async (
  pageNum = 1,
  opts: {
    search?: string;
    tagTermId?: number;
    currentUserId?: number | null;
    sortBy?: ForumSortBy;
  } = {},
): Promise<{topics: ForumTopic[]; hasMore: boolean}> => {
  const headers = await authHeaders();
  let url = `${BASE}/buddyboss/v1/topics?per_page=15&page=${pageNum}&_embed=1`;
  if (opts.search) url += `&search=${encodeURIComponent(opts.search)}`;
  if (opts.tagTermId) url += `&topic-tag=${opts.tagTermId}`;
  if (opts.sortBy === 'popular') url += `&orderby=popular&order=desc`;
  else url += `&orderby=date&order=desc`; // 'newest' and 'activity' both map here — see note above

  const res = await fetch(url, {headers});
  if (!res.ok) return {topics: [], hasMore: false};
  const data = await res.json();
  if (!Array.isArray(data)) return {topics: [], hasMore: false};

  await prefetchAuthors(data);
  const topics = data.map((item: any) => mapTopic(item, opts.currentUserId ?? null));
  return {topics, hasMore: data.length === 15};
};

// ─── GET single topic detail ─────────────────────────────────────────────────
export const getTopic = async (
  topicId: number,
  currentUserId: number | null = null,
): Promise<ForumTopic | null> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/topics/${topicId}?_embed=1`, {headers});
  if (!res.ok) return null;
  const data = await res.json();
  await prefetchAuthors([data]);
  return mapTopic(data, currentUserId);
};

// ─── GET tags + voice count for a batch of topic ids (Feed forum-card enrichment)
// Feed's own activity endpoint doesn't carry topic_tags or voice_count on
// forum-type items (confirmed against a real payload 2026-08-24 — those
// fields only exist on /buddyboss/v1/topics/{id}), so FeedScreen calls this
// after loading a page of posts to fill in tags/"People Involved" for the
// forum-type ones. Runs the per-topic fetches in parallel rather than
// sequentially — still N calls for N forum posts on the page (no batch
// topics-by-id endpoint exists here), but capped at however many forum
// posts are actually on one page of Feed (usually a handful out of 15).
export const getTopicTagsAndVoices = async (
  topicIds: number[],
): Promise<Map<number, {tags: string[]; voiceCount: number}>> => {
  const result = new Map<number, {tags: string[]; voiceCount: number}>();
  const uniqueIds = [...new Set(topicIds)].filter(Boolean);
  if (uniqueIds.length === 0) return result;
  await Promise.all(
    uniqueIds.map(async id => {
      const topic = await getTopic(id);
      if (topic) result.set(id, {tags: topic.tags, voiceCount: topic.voiceCount});
    }),
  );
  return result;
};

// ─── Reply type ────────────────────────────────────────────────────────────────
export interface ForumReply {
  id: number;
  content: string;
  time: string;
  rawDate: string;
  isOwn: boolean;
  author: {
    id: number;
    name: string;
    avatar: string;
    title: string;
    flag: string;
    country: string;
  };
}

const mapReply = (item: any, currentUserId: number | null): ForumReply => {
  const embeddedUser = item._embedded?.user?.[0];
  const author = enrichAuthor(
    item.author,
    embeddedUser?.name || 'IPM Member',
    embeddedUser?.avatar_urls?.thumb ||
      `https://www.gravatar.com/avatar/${item.author}?s=96&d=identicon`,
  );
  return {
    id: item.id,
    content: stripHtml(item.content?.rendered || item.content?.raw || ''),
    time: formatDate(item.date),
    rawDate: item.date,
    isOwn: currentUserId != null && item.author === currentUserId,
    author,
  };
};

// ─── GET replies for a topic ─────────────────────────────────────────────────
export const getReplies = async (
  topicId: number,
  currentUserId: number | null = null,
): Promise<ForumReply[]> => {
  const headers = await authHeaders();
  // Per Robby (2026-07-10): the correct route is singular "reply" (not
  // "topics/{id}/replies", which 404s), with the topic id passed as a
  // "parent" query param, not a path segment.
  const res = await fetch(
    `${BASE}/buddyboss/v1/reply?parent=${topicId}&per_page=50&order=asc&_embed=1`,
    {headers},
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  await prefetchAuthors(data);
  return data.map((item: any) => mapReply(item, currentUserId));
};

// ─── POST a reply ─────────────────────────────────────────────────────────────
// FIXED: this previously POSTed to /buddyboss/v1/topics/{id}/replies, which
// was only ever a guess and never confirmed to work — flagged in a comment
// here as untested. That guess mirrored the exact same wrong shape that
// getReplies() used to use for GET (see the note above getReplies), which
// was confirmed via Postman (2026-07-10, per Robby) to 404 with
// "rest_no_route". The real route is the singular "/buddyboss/v1/reply"
// endpoint, with the parent topic id passed in the BODY as "parent" (not in
// the URL path). This is what was actually silently breaking "Publish" on
// Reply to Discussion — the request 404'd, postReply() returned false, and
// the screen just sat there with no error shown and nothing posted.
export const postReply = async (
  topicId: number,
  content: string,
  media?: {mediaIds?: number[]; videoIds?: number[]; documentIds?: number[]},
): Promise<boolean> => {
  const headers = await authHeaders();
  // The documented shape uses "parent" for the topic id, but the live
  // backend actually rejects that with "Missing parameter(s): topic_id"
  // (confirmed via the real 400 response) — so despite the docs, this
  // specific endpoint wants the field named topic_id, not parent.
  const body: any = {topic_id: topicId, content, status: 'publish'};
  if (media?.mediaIds?.length) body.bbp_media = media.mediaIds;
  if (media?.videoIds?.length) body.bbp_videos = media.videoIds;
  if (media?.documentIds?.length) body.bbp_documents = media.documentIds;
  const res = await fetch(`${BASE}/buddyboss/v1/reply`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Surface the real reason instead of a silent/generic failure — the
    // backend's actual error message (invalid param, permission issue,
    // wrong field name, etc.) is far more useful than just "not ok".
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson?.message || JSON.stringify(errJson);
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '';
      }
    }
    throw new Error(`postReply failed (${res.status}): ${detail || 'no response body'}`);
  }
  return true;
};

// ─── EDIT a reply ─────────────────────────────────────────────────────────────
export const updateReply = async (replyId: number, content: string): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/replies/${replyId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({content}),
  });
  return res.ok;
};

// ─── DELETE a reply ───────────────────────────────────────────────────────────
export const deleteReply = async (replyId: number): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/replies/${replyId}`, {
    method: 'DELETE',
    headers,
  });
  return res.ok;
};

// ─── CREATE a new discussion/topic ───────────────────────────────────────────
export const createTopic = async (params: {
  title: string;
  content: string;
  forumId: number;
  tagNames?: string[];
  mediaIds?: number[];
  videoIds?: number[];
  documentIds?: number[];
}): Promise<{ok: boolean; id?: number}> => {
  const headers = await authHeaders();
  const body: any = {
    title: params.title,
    content: params.content,
    // BuddyBoss's /buddyboss/v1/topics endpoint expects the parent forum id
    // under "parent", NOT "forum_id" — confirmed via live testing 2026-07-04.
    parent: params.forumId,
    status: 'publish',
  };
  // Field names match what's on the topic JSON schema itself (bbp_media,
  // bbp_videos, bbp_documents — seen null on every topic fetched so far).
  // Untested against a real upload as of this writing — first real usage.
  if (params.mediaIds?.length) body.bbp_media = params.mediaIds;
  if (params.videoIds?.length) body.bbp_videos = params.videoIds;
  if (params.documentIds?.length) body.bbp_documents = params.documentIds;
  // Per Robby (2026-07-10): tags at creation time go under "topic_tags"
  // (underscore) as a comma-separated string of TAG NAMES — not term IDs,
  // and not the hyphenated "topic-tag" we'd tried earlier. Max 3, same as
  // website. This alone was still unreliable in testing, so createTopic
  // also calls assignTopicTags() as a follow-up (see below) — belt and
  // braces, since Robby's endpoint doc lists a dedicated tags endpoint too.
  if (params.tagNames?.length) {
    body.topic_tags = params.tagNames.slice(0, 3).join(', ');
  }
  const res = await fetch(`${BASE}/buddyboss/v1/topics`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Same pattern as postReply — surface the real backend error instead of
    // a generic failure, since the topic may actually be getting created
    // server-side despite a non-OK response, or vice versa.
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson?.message || JSON.stringify(errJson);
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '';
      }
    }
    throw new Error(`createTopic failed (${res.status}): ${detail || 'no response body'}`);
  }
  const data = await res.json();
  if (!data?.id) {
    // The request succeeded (2xx) but the response didn't have an "id"
    // field where we expected it — rather than silently reporting failure
    // (which is what caused topics to actually get created while the app
    // showed an error, prompting duplicate retries), surface the actual
    // response shape so we can see what field the id is really under.
    throw new Error(`createTopic: 2xx response but no "id" field. Response: ${JSON.stringify(data)}`);
  }

  // Follow-up call to explicitly assign tags via the dedicated endpoint,
  // in case topic_tags at creation doesn't take (matches the pattern we
  // saw where PUT-with-topic-tag silently dropped tags too — this is the
  // documented, Robby-confirmed way to set them).
  if (params.tagNames?.length) {
    await assignTopicTags(data.id, params.tagNames.slice(0, 3));
  }

  return {ok: true, id: data.id};
};

// ─── Assign tags to an existing topic (dedicated endpoint, per Robby) ───────
export const assignTopicTags = async (topicId: number, tagNames: string[]): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/topics/${topicId}/tags`, {
    method: 'POST',
    headers,
    body: JSON.stringify({topic_tags: tagNames.join(', ')}),
  });
  return res.ok;
};

// ─── Search topic-tag taxonomy terms (id/name/slug) ──────────────────────────
// Per Robby: taxonomy terms are fetched via the native wp/v2 route, not a
// buddyboss/v1 one — separate from the topics/replies endpoints entirely.
export const searchTopicTags = async (
  search: string,
): Promise<{id: number; name: string; slug: string}[]> => {
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/wp/v2/topic-tag?per_page=100&page=1&search=${encodeURIComponent(search)}`,
    {headers},
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((t: any) => ({id: t.id, name: stripHtml(t.name), slug: t.slug}));
};

// ─── DELETE a topic ───────────────────────────────────────────────────────────
export const deleteTopic = async (topicId: number): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/topics/${topicId}`, {
    method: 'DELETE',
    headers,
  });
  return res.ok;
};

// ─── Report a topic or reply ─────────────────────────────────────────────────
// Mirrors the moderation pattern confirmed working for activity posts in
// feedApi.reportActivity, but targets the 'topic' or 'reply' item type.
export const reportForumItem = async (
  itemId: number,
  itemType: 'topic' | 'reply',
  reasons: string[],
): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/moderation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      item_id: itemId,
      item_type: itemType,
      category_id: reasons.join(','),
      note: reasons.join(', '),
    }),
  });
  return res.ok;
};

// ─── Trending / Latest forums for the Explore section ───────────────────────
// "Trending" = highest reply_count in a recent window; "Latest" = most recent
// activity. Both derived client-side from the same topics fetch since there's
// no dedicated trending endpoint — sort by the relevant field after fetching
// a slightly larger page.
export const getExploreForums = async (
  currentUserId: number | null = null,
): Promise<{trending: ForumTopic[]; latest: ForumTopic[]}> => {
  const {topics} = await getTopics(1, {currentUserId});
  const trending = [...topics].sort((a, b) => b.replyCount - a.replyCount).slice(0, 1);
  const latest = [...topics]
    .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
    .slice(0, 2);
  return {trending, latest};
};

// ─── Forum list (parent forums, for the "Create Discussion" forum picker) ───
export interface ForumListItem {
  id: number;
  name: string;
  topicCount: number;
}

export const getForumsList = async (): Promise<ForumListItem[]> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/forums?per_page=50`, {headers});
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((f: any) => !f.is_forum_category)
    .map((f: any) => ({
      id: f.id,
      name: stripHtml(f.title?.rendered || ''),
      topicCount: f.total_topic_count || 0,
    }));
};
