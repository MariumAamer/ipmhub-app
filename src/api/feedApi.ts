import * as Keychain from 'react-native-keychain';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── Token helper ─────────────────────────────────────────────────────────────
export const getToken = async (): Promise<string | null> => {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds?.password) return null;
    return JSON.parse(creds.password)?.token ?? null;
  } catch {
    return null;
  }
};

// ─── Auth headers ─────────────────────────────────────────────────────────────
const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// ─── fetch with a hard timeout ────────────────────────────────────────────────
// React Native's fetch has no default timeout. If a request never gets a
// response — dropped connection, server-side hang, a proxy silently sitting
// on the socket — the awaiting call just hangs forever: it never resolves
// AND never rejects, so any try/catch around it never runs and any loading
// spinner tied to it never clears. This is what was happening on Introductions
// comment posting: "Post Comment" spun forever with no error alert, because
// the request itself was stuck, not failing. Used for the comment-posting
// path (postActivityComment / getActivityComments) since that's the flow
// that was reported hanging; safe to apply more broadly later.
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {...options, signal: controller.signal});
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

// ─── Strip HTML ───────────────────────────────────────────────────────────────
// WordPress/BuddyBoss content is rendered with HTML entities encoded (e.g. a
// straight/curly apostrophe becomes &#039; or &#8217;). Only &nbsp;/&amp; were
// being decoded before, so every other entity — most commonly apostrophes in
// contractions like "can't" — was showing up as raw entity code in the app.
// This decodes the common named + numeric entities WP actually emits.
const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#034;': '"',
  '&#8220;': '“',
  '&#8221;': '”',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&#039;': "'",
  '&#8217;': '’',
  '&#8216;': '‘',
  '&apos;': "'",
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&#8211;': '–',
  '&#8212;': '—',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&#8230;': '…',
  '&lt;': '<',
  '&gt;': '>',
};

export const stripHtml = (html: string): string => {
  let text = (html || '')
    // Convert block-level closing tags / <br> to line breaks BEFORE
    // stripping tags, otherwise "<p>A</p><p>B</p>" collapses to "AB" with
    // no space between paragraphs at all.
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  // Named + common numeric entities first
  Object.entries(HTML_ENTITIES).forEach(([entity, char]) => {
    text = text.split(entity).join(char);
  });
  // Any remaining numeric entities (&#123; / &#x7B;) not covered above
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
  text = text.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCodePoint(parseInt(dec, 10)),
  );
  // Collapse 3+ line breaks down to a max of one blank line between paras
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
};

// ─── Decode entities only (no tag-stripping/paragraph reflow) ───────────────
// Names, job titles, and other short plain-text fields never contain HTML
// tags, but they DO come back HTML-entity-encoded just like post content
// (e.g. a member named "R&D" or a job title with a curly apostrophe). These
// fields were being rendered completely raw across this file — author.name,
// author.title, likedBy[].name/.title, mapMember's name/title — so any
// entity in them showed up as literal "&amp;"/"&#8217;" text on Feed,
// Introductions, and LikedBy screens. Reuses the same entity table as
// stripHtml, just without the tag/paragraph handling that field never needs.
const decodeEntities = (text: string): string => {
  let out = text || '';
  Object.entries(HTML_ENTITIES).forEach(([entity, char]) => {
    out = out.split(entity).join(char);
  });
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
  out = out.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCodePoint(parseInt(dec, 10)),
  );
  return out.trim();
};

// ─── Format date ──────────────────────────────────────────────────────────────
export const formatDate = (d: string): string => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Country name → ISO 3166-1 alpha-2 code ──────────────────────────────────
// Covers the country-name strings BuddyBoss xprofile COUNTRY fields store.
const COUNTRY_TO_ISO: Record<string, string> = {
  Afghanistan: 'AF', Albania: 'AL', Algeria: 'DZ', Andorra: 'AD', Angola: 'AO',
  Argentina: 'AR', Armenia: 'AM', Australia: 'AU', Austria: 'AT',
  Azerbaijan: 'AZ', Bahamas: 'BS', Bahrain: 'BH', Bangladesh: 'BD',
  Barbados: 'BB', Belarus: 'BY', Belgium: 'BE', Belize: 'BZ', Benin: 'BJ',
  Bhutan: 'BT', Bolivia: 'BO', 'Bosnia and Herzegovina': 'BA',
  Botswana: 'BW', Brazil: 'BR', Brunei: 'BN', Bulgaria: 'BG',
  'Burkina Faso': 'BF', Burundi: 'BI', Cambodia: 'KH', Cameroon: 'CM',
  Canada: 'CA', Chad: 'TD', Chile: 'CL', China: 'CN', Colombia: 'CO',
  Congo: 'CG', 'Costa Rica': 'CR', Croatia: 'HR', Cuba: 'CU', Cyprus: 'CY',
  'Czech Republic': 'CZ', Czechia: 'CZ', Denmark: 'DK', Djibouti: 'DJ',
  'Dominican Republic': 'DO', Ecuador: 'EC', Egypt: 'EG',
  'El Salvador': 'SV', Estonia: 'EE', Ethiopia: 'ET', Fiji: 'FJ',
  Finland: 'FI', France: 'FR', Gabon: 'GA', Gambia: 'GM', Georgia: 'GE',
  Germany: 'DE', Ghana: 'GH', Greece: 'GR', Guatemala: 'GT', Guinea: 'GN',
  Guyana: 'GY', Haiti: 'HT', Honduras: 'HN', 'Hong Kong': 'HK',
  Hungary: 'HU', Iceland: 'IS', India: 'IN', Indonesia: 'ID', Iran: 'IR',
  Iraq: 'IQ', Ireland: 'IE', Israel: 'IL', Italy: 'IT', Jamaica: 'JM',
  Japan: 'JP', Jordan: 'JO', Kazakhstan: 'KZ', Kenya: 'KE', Kuwait: 'KW',
  Kyrgyzstan: 'KG', Laos: 'LA', Latvia: 'LV', Lebanon: 'LB', Lesotho: 'LS',
  Liberia: 'LR', Libya: 'LY', Liechtenstein: 'LI', Lithuania: 'LT',
  Luxembourg: 'LU', Madagascar: 'MG', Malawi: 'MW', Malaysia: 'MY',
  Maldives: 'MV', Mali: 'ML', Malta: 'MT', Mauritania: 'MR',
  Mauritius: 'MU', Mexico: 'MX', Moldova: 'MD', Monaco: 'MC',
  Mongolia: 'MN', Montenegro: 'ME', Morocco: 'MA', Mozambique: 'MZ',
  Myanmar: 'MM', Namibia: 'NA', Nepal: 'NP', Netherlands: 'NL',
  'New Zealand': 'NZ', Nicaragua: 'NI', Niger: 'NE', Nigeria: 'NG',
  'North Macedonia': 'MK', Norway: 'NO', Oman: 'OM', Pakistan: 'PK',
  Panama: 'PA', 'Papua New Guinea': 'PG', Paraguay: 'PY', Peru: 'PE',
  Philippines: 'PH', Poland: 'PL', Portugal: 'PT', Qatar: 'QA',
  Romania: 'RO', Russia: 'RU', Rwanda: 'RW',
  'Saudi Arabia': 'SA', Senegal: 'SN', Serbia: 'RS', Singapore: 'SG',
  Slovakia: 'SK', Slovenia: 'SI', Somalia: 'SO', 'South Africa': 'ZA',
  'South Korea': 'KR', 'South Sudan': 'SS', Spain: 'ES', 'Sri Lanka': 'LK',
  Sudan: 'SD', Sweden: 'SE', Switzerland: 'CH', Syria: 'SY', Taiwan: 'TW',
  Tajikistan: 'TJ', Tanzania: 'TZ', Thailand: 'TH', Togo: 'TG',
  'Trinidad and Tobago': 'TT', Tunisia: 'TN', Turkey: 'TR',
  Turkmenistan: 'TM', Uganda: 'UG', Ukraine: 'UA',
  'United Arab Emirates': 'AE', UAE: 'AE',
  'United Kingdom': 'GB', UK: 'GB',
  'United States': 'US', 'United States of America': 'US', USA: 'US',
  Uruguay: 'UY', Uzbekistan: 'UZ', Venezuela: 'VE', Vietnam: 'VN',
  Yemen: 'YE', Zambia: 'ZM', Zimbabwe: 'ZW',
};

// Converts an ISO 3166-1 alpha-2 code (e.g. "IE") into its flag emoji by
// mapping each letter to a Unicode regional indicator symbol. Works for
// every valid 2-letter code without needing a separate emoji per country.
const isoToFlagEmoji = (iso: string): string => {
  if (!iso || iso.length !== 2) return '';
  const codePoints = iso
    .toUpperCase()
    .split('')
    .map(c => 0x1f1e6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
};

// ─── Country name → flag emoji ───────────────────────────────────────────────
export const countryFlag = (country: string): string => {
  if (!country) return '';
  const trimmed = country.trim();
  const iso = COUNTRY_TO_ISO[trimmed];
  return iso ? isoToFlagEmoji(iso) : '';
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface FeedPost {
  id: number;
  type: 'post' | 'forum' | 'ipm' | 'intro';
  author: {
    id: number;
    name: string;
    username: string;
    avatar: string;
    title: string;
    flag: string;
    country: string;
  };
  title?: string;
  content: string;
  fullContent: string;
  truncated: boolean;
  image?: string | null;
  // width/height, from bp_media_ids[].attachment_data.meta — lets the image
  // render at its real aspect ratio instead of being forced into a fixed
  // box and cropped by resizeMode="cover".
  imageAspectRatio?: number | null;
  linkPreview?: {title: string; url: string; image: string} | null;
  forumTags?: string[] | null;
  forumMeta?: {type: string; people: number | null} | null;
  topicId?: number | null;
  likes: number;
  comments: number;
  liked: boolean;
  canLike: boolean;
  canComment: boolean;
  // liked_by comes embedded on the single-activity endpoint. The LIST
  // endpoint getFeed() uses does not always embed it — see
  // getActivityLikers() below, which LikedByScreen falls back to.
  likedBy: LikedByUser[];
  time: string;
  rawDate: string;
  isMuted?: boolean;
}

export interface Member {
  id: number;
  name: string;
  username: string;
  avatar: string;
  title: string;
  following: boolean;
}

// ─── Extract a forum activity's real title out of its rendered markup ───────
// Confirmed via a real Postman response against /buddyboss/v1/activity,
// 2026-08-19: bbp_topic_create / bbp_reply_create items have NO
// bp_topic_title or secondary_content field at all — both are simply absent
// from the payload, not just empty. So the previous approach (read the title
// from one of those fields, then strip it back out of content if it
// duplicated) was chasing a field that doesn't exist; the real duplication
// is baked into content.rendered itself. BuddyBoss's own markup for these
// activities looks like:
//   <p class="activity-discussion-title-wrap"><a href="...">TITLE</a></p>
//   <div class="bb-content-inr-wrap">
//     <p class="activity-discussion-title-wrap forms-title-feed"><a href="...">TITLE</a></p>
//     <div class="bb-content-inr-wrap forms-para-feed"><p>REAL BODY</p></div>
//   </div>
// — the title wrapped TWICE (once for a compact view, once above the full
// body), each hidden/shown by BuddyBoss's own web CSS depending on context.
// This app has no such CSS, so naively stripping all tags with stripHtml()
// concatenated both title copies AND the real body into one string — title,
// title again, then the body — which is exactly the double-title bug Feed
// was showing. Pulling the title out of the first title-wrap anchor here
// gives the clean, single copy.
const extractForumTitle = (html: string): string => {
  const match = html.match(
    /<p[^>]*class\s*=\s*"[^"]*activity-discussion-title-wrap[^"]*"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i,
  );
  return match ? stripHtml(match[1]).trim() : '';
};

// ─── Map liked_by payload → LikedByUser[] ─────────────────────────────────────
// Shared shape mapping used by mapActivity, getActivityComments,
// getIntroductions, AND getActivityLikers below — all of these read a
// liked_by array off different endpoints but expect it in the same shape.
const mapLikedBy = (list: any[]): LikedByUser[] =>
  (list || []).map((u: any) => ({
    id: u.user_id,
    name: decodeEntities(u.full_name || 'Member'),
    avatar:
      u.avatar ||
      `https://www.gravatar.com/avatar/${u.user_id || 0}?s=96&d=identicon`,
    title: decodeEntities(u.job_title || u.position || ''),
    profileUrl: u.profile_url || '',
  }));

// ─── Map activity item → FeedPost ────────────────────────────────────────────
const mapActivity = (item: any): FeedPost => {
  // BuddyBoss's content_stripped field is addslashes()-escaped plain text —
  // e.g. "I\'m running" with a literal backslash before every apostrophe —
  // meant for embedding in inline JS, not for display. It was being used
  // first, which is why apostrophes were showing up as "\'" in the app even
  // after HTML-entity decoding was fixed. content.rendered's entities (the
  // same &#8217; etc. covered by stripHtml) don't have this problem, so it's
  // the primary source for regular posts; content_stripped is only a
  // last-resort fallback there, with its backslash-escapes removed.
  const renderedHtml =
    typeof item.content === 'string' ? item.content : item.content?.rendered;

  let type: FeedPost['type'] = 'post';
  if (
    item.component === 'bbpress' ||
    item.type === 'bbp_topic_create' ||
    item.type === 'bbp_reply_create'
  ) {
    type = 'forum';
  }

  let title: string;
  let content: string;

  if (type === 'forum') {
    // For forum activities, content_stripped is ALREADY just the clean body
    // text with no title duplication (confirmed on the live payload above)
    // — it's the rendered HTML that duplicates the title, not this field —
    // so it's used directly here instead of parsing the body back out of
    // the markup. The title still has to come from the markup since there's
    // no dedicated title field on this endpoint.
    title = renderedHtml ? extractForumTitle(renderedHtml) : '';
    content = (item.content_stripped || '').replace(/\\(['"])/g, '$1');
    if (!content && renderedHtml) content = stripHtml(renderedHtml);
  } else {
    content = renderedHtml
      ? stripHtml(renderedHtml)
      : (item.content_stripped || '').replace(/\\(['"])/g, '$1');
    title = '';
  }

  const isLong = content.length > 180;

  // For bbp_topic_create the activity's primary_item_id IS the topic id.
  // For bbp_reply_create the topic id is the secondary_item_id instead
  // (primary_item_id there is the reply id).
  let topicId: number | null = null;
  if (type === 'forum') {
    if (item.type === 'bbp_reply_create') {
      topicId = item.secondary_item_id || null;
    } else {
      topicId = item.primary_item_id || null;
    }
  }

  // Confirmed via Postman: bp_media_ids is an array of full media objects
  // (each with its own attachment_data.full/thumb), not just IDs, and there
  // is no separate item.media field — that was the bug.
  const mediaImage =
    item.bp_media_ids?.[0]?.attachment_data?.full ||
    item.bp_media_ids?.[0]?.attachment_data?.thumb ||
    item.bp_media_ids?.[0]?.url ||
    null;
  const mediaMeta = item.bp_media_ids?.[0]?.attachment_data?.meta;
  const imageAspectRatio =
    mediaMeta?.width && mediaMeta?.height
      ? mediaMeta.width / mediaMeta.height
      : null;

  const linkPreview = item.bp_link_preview?.title
    ? {
        title: decodeEntities(item.bp_link_preview.title),
        url: item.bp_link_preview.url || '',
        image:
          item.bp_link_preview.images?.[0] || item.bp_link_preview.image || '',
      }
    : null;

  return {
    id: item.id,
    type,
    author: {
      id: item.user_id || 0,
      name: decodeEntities(item.name || 'IPM Member'),
      username: item.user_login || '',
      avatar:
        item.user_avatar?.thumb ||
        item.user_avatar?.full ||
        `https://www.gravatar.com/avatar/${item.user_id}?s=96&d=identicon`,
      title: '',
      flag: '',
      country: '',
    },
    title: decodeEntities(title),
    content: isLong ? content.slice(0, 180) : content,
    fullContent: content,
    truncated: isLong,
    image: mediaImage,
    imageAspectRatio,
    linkPreview,
    forumTags: item.forum_tags?.map((t: any) => decodeEntities(t.name)) || null,
    topicId,
    forumMeta:
      type === 'forum'
        ? {
            type:
              item.type === 'bbp_reply_create' ? 'Forum Reply' : 'New Forum',
            people: null,
          }
        : null,
    likes: item.favorite_count ?? 0,
    comments: item.comment_count ?? 0,
    liked: item.favorited ?? false,
    canLike: item.can_favorite ?? false,
    canComment: item.can_comment ?? false,
    likedBy: mapLikedBy(item.liked_by),
    time: formatDate(item.date),
    rawDate: item.date,
    isMuted: false,
  };
};

// ─── Resolve full name reliably ──────────────────────────────────────────────
// xprofile FIRST_NAME (1) + LAST_NAME (2) are confirmed-working field IDs.
// "name"/"user_login" on some BuddyBoss configs return a username/slug instead
// of the display name, which is why a few members show "dull" names.
export const resolveFullName = (item: any, fallback = 'IPM Member'): string => {
  const groups = item?.xprofile?.groups?.['1']?.fields;
  const firstName = groups?.['1']?.value?.raw?.trim() || '';
  const lastName = groups?.['2']?.value?.raw?.trim() || '';
  const xprofileName = [firstName, lastName].filter(Boolean).join(' ');
  return decodeEntities(xprofileName || item?.name || fallback);
};

// ─── Map member → Member ──────────────────────────────────────────────────────
const mapMember = (item: any): Member => ({
  id: item.id,
  name: resolveFullName(item, 'Member'),
  username: item.user_login || '',
  avatar:
    item.avatar_urls?.thumb ||
    item.avatar_urls?.full ||
    item.user_avatar?.thumb ||
    `https://www.gravatar.com/avatar/${item.id}?s=96&d=identicon`,
  title: decodeEntities(
    item.xprofile?.groups?.['1']?.fields?.['1097']?.value?.raw || 'IPM Member',
  ),
  // Confirmed via Postman 2026-07-31: is_following is the real one-way follow
  // status field. friendship_status ('is_friend'/'not_friends') is a
  // completely separate bidirectional Connections feature — a member can
  // show friendship_status: "not_friends" while is_following: true at the
  // same time, so that was the wrong field for a "Follow" button.
  following: item.is_following ?? false,
});

// ─── GET feed posts ───────────────────────────────────────────────────────────
export const getFeed = async (page = 1): Promise<FeedPost[]> => {
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/buddyboss/v1/activity?per_page=15&page=${page}&display_comments=false`,
    {headers},
  );
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map(mapActivity);
};

// ─── GET newest members ───────────────────────────────────────────────────────
export const getNewestMembers = async (): Promise<Member[]> => {
  const headers = await authHeaders();
  // xprofile param is required — without it the list endpoint omits xprofile
  // groups/fields entirely, so name resolution would silently fall back.
  const res = await fetch(
    `${BASE}/buddyboss/v1/members?per_page=6&type=newest&xprofile=1`,
    {headers},
  );
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map(mapMember);
};

// ─── Like / unlike ────────────────────────────────────────────────────────────
// Confirmed via Postman 2026-07-26: every activity item's _links.favorite
// points to /activity/{id}/favorite — POST to like, DELETE to unlike. This is
// the endpoint tied to the favorite_count/favorited fields the app displays.
// (Previously posted to /activity/{id}/emotion, BuddyBoss's separate
// Reactions feature — reacted_counts/reacted_id — which never touched
// favorite_count/favorited, so likes appeared to not persist/fetch.)
export const toggleLike = async (
  postId: number,
  currentlyLiked: boolean,
): Promise<void> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/activity/${postId}/favorite`, {
    method: currentlyLiked ? 'DELETE' : 'POST',
    headers,
  });
  // fetch() doesn't throw on 4xx/5xx — without this check, a failed
  // like/unlike (expired token, network hiccup, etc.) silently "succeeds"
  // from the caller's point of view, so the optimistic UI update in
  // FeedScreen's handleLike() never gets reverted. That's the bug behind
  // likes looking fine on-screen but not sticking after a refresh/reinstall
  // on a real device.
  if (!res.ok) {
    throw new Error(`Failed to ${currentlyLiked ? 'unlike' : 'like'} post ${postId}`);
  }
};

// ─── GET who liked a specific activity/comment ────────────────────────────────
// Root cause, confirmed by pulling a real activity's payload and route table
// directly from the site 2026-08-20: `liked_by` doesn't exist ANYWHERE on
// /buddyboss/v1/activity/{id} — that field was never actually present, on
// this install, on either the list or single-item endpoint (the two earlier
// attempts at this fix were both chasing a field that doesn't exist here).
// What IS on the single-activity response is `favorite_count` /
// `favorited` (the tap-to-like count/state this app displays) alongside
// `reacted_names` / `reacted_counts` / `reacted_id` — those last three come
// from BuddyBoss's separate Reactions subsystem. Turns out this site's
// "like" button is wired, server-side, to award a single Reaction (id
// 55548) at the same time it flips favorite_count — confirmed by comparing
// a live activity item: favorite_count: 4 lined up exactly with
// reacted_counts: [{id: 55548, count: 4}]. The one place BuddyBoss DOES
// expose a real per-user list for this is the reactions REST resource:
//   GET /buddyboss/v1/user-reactions?item_id={id}&item_type=activity
// which returns one row per liker with a real user_id — confirmed against
// the same live item (4 rows, matching the 4 favorite_count exactly).
// Comments are their own item_type ('activity_comment') in this same
// resource, so a comment id is queried the same way with that item_type.
const fetchReactors = async (
  itemId: number,
  itemType: 'activity' | 'activity_comment',
): Promise<number[]> => {
  const headers = await authHeaders();
  try {
    const res = await fetch(
      `${BASE}/buddyboss/v1/user-reactions?item_id=${itemId}&item_type=${itemType}&per_page=100`,
      {headers},
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((r: any) => Number(r.user_id)).filter(Boolean);
  } catch {
    return [];
  }
};

export const getActivityLikers = async (activityId: number): Promise<LikedByUser[]> => {
  // Try as a top-level post first, then as a comment — the caller doesn't
  // always know which kind of id it's holding (FeedScreen/IntrosScreen pass
  // both post ids and comment ids through the same LikedByScreen route).
  let ids = await fetchReactors(activityId, 'activity');
  if (ids.length === 0) {
    ids = await fetchReactors(activityId, 'activity_comment');
  }
  if (ids.length === 0) return [];

  const members = await getMembersBatch(ids);
  return ids.map(id => {
    const m = members.get(id);
    return {
      id,
      name: m ? resolveFullName(m, 'Member') : 'Member',
      avatar:
        m?.avatar_urls?.thumb ||
        m?.avatar_urls?.full ||
        `https://www.gravatar.com/avatar/${id}?s=96&d=identicon`,
      title: decodeEntities(
        m?.xprofile?.groups?.['1']?.fields?.['1097']?.value?.raw || '',
      ),
      profileUrl: '',
    };
  });
};

// ─── Delete activity post ─────────────────────────────────────────────────────
export const deleteActivity = async (postId: number): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/activity/${postId}`, {
    method: 'DELETE',
    headers,
  });
  return res.ok;
};

// ─── Update activity post ─────────────────────────────────────────────────────
export const updateActivity = async (
  postId: number,
  content: string,
): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/activity/${postId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({content}),
  });
  return res.ok;
};

// ─── Mute / unmute activity notifications ────────────────────────────────────
// BuddyBoss uses subscription model; mute = unsubscribe, unmute = subscribe
export const muteActivity = async (postId: number): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/buddyboss/v1/activity/${postId}/subscription`,
    {method: 'DELETE', headers},
  );
  return res.ok;
};

export const unmuteActivity = async (postId: number): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/buddyboss/v1/activity/${postId}/subscription`,
    {method: 'POST', headers},
  );
  return res.ok;
};

// ─── Report activity ──────────────────────────────────────────────────────────
export const reportActivity = async (
  postId: number,
  reasons: string[],
): Promise<boolean> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/moderation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      item_id: postId,
      item_type: 'activity',
      category_id: reasons.join(','),
      note: reasons.join(', '),
    }),
  });
  return res.ok;
};

// ─── Fetch member profile to get designation + flag ──────────────────────────
// xprofile=1 is required — without it BuddyBoss omits xprofile groups/fields
// entirely, so full name + job title resolve to blank and silently fall back
// to username everywhere this is used (Feed enrichment, Create Post header).
export const getMemberProfile = async (userId: number): Promise<any> => {
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/buddyboss/v1/members/${userId}?xprofile=1`,
    {headers},
  );
  if (!res.ok) return null;
  return res.json();
};

// ─── Batch member fetch — fixes the N+1 pattern where each post/topic/reply
// triggers an individual getMemberProfile() call. Fetches multiple members'
// xprofile data in ONE request via BuddyBoss's `include` param, keyed by
// userId for O(1) lookup after.
export const getMembersBatch = async (userIds: number[]): Promise<Map<number, any>> => {
  const result = new Map<number, any>();
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return result;
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/buddyboss/v1/members?include=${uniqueIds.join(',')}&xprofile=1&per_page=${uniqueIds.length}`,
    {headers},
  );
  if (!res.ok) return result;
  const data = await res.json();
  if (!Array.isArray(data)) return result;
  data.forEach((member: any) => result.set(Number(member.id), member));
  return result;
};

// ─── Resolve a WordPress username to its BuddyBoss member profile ────────────
// The 'introduction' custom post type has no author field on the post object
// itself — only a slug/title that IS the WP username (e.g. "kaushikgadgil").
// /buddyboss/v1/members?search={username} resolves it and already includes
// xprofile data in the same call, so no second xprofile=1 request is needed.
export const getMemberByUsername = async (username: string): Promise<any> => {
  if (!username) return null;
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/buddyboss/v1/members?search=${encodeURIComponent(username)}`,
    {headers},
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  // search can return near-matches; prefer an exact user_login/mention_name hit
  const exact = data.find(
    (m: any) =>
      m.user_login?.toLowerCase() === username.toLowerCase() ||
      m.mention_name?.toLowerCase() === username.toLowerCase(),
  );
  return exact || data[0];
};

// ─── Introductions ────────────────────────────────────────────────────────────
export interface IntroComment {
  id: number;
  author: {name: string; avatar: string};
  content: string;
  time: string;
}

export interface LikedByUser {
  id: number;
  name: string;
  avatar: string;
  title: string;
  profileUrl: string;
}

export interface IntroPost {
  id: number;
  slug: string;
  content: string;
  fullContent: string;
  truncated: boolean;
  time: string;
  rawDate: string;
  commentCount: number;
  activityId: number | null;
  likes: number;
  liked: boolean;
  canLike: boolean;
  comments: number;
  canComment: boolean;
  // liked_by comes embedded in the same response — confirmed 2026-07-27.
  likedBy: LikedByUser[];
  // Comments come embedded in the same response — no separate fetch needed
  // to show them; only posting a new one still hits the activity endpoint.
  embeddedComments: IntroComment[];
  author: {
    id: number;
    name: string;
    username: string;
    avatar: string;
    title: string;
    flag: string;
    country: string;
  };
}

// Confirmed via Postman 2026-07-27: GET /custom/v1/introductions returns
// everything the Introductions screen needs in one call — author (name,
// avatar, position, job_title, company, profile_url), like_count,
// liked_by_me, comment_count, and embedded comments (with their own author +
// like_count) — keyed correctly to the intro's own activity_id. This
// replaces the old approach of fetching wp/v2/introduction, separately
// matching against the BuddyBoss activity list by intro_id, and then doing a
// per-post getMemberByUsername lookup for author details — all of which is
// now done server-side by this endpoint.
//
// NOTE: this endpoint's author object has no country field, so the flag
// emoji shown next to each author's name can't be populated from here (it's
// left blank). Flagged for Robby — if the flag is wanted back, `country` (or
// a country code) needs adding to author in this endpoint's response.
export const getIntroductions = async (page = 1): Promise<IntroPost[]> => {
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/custom/v1/introductions?page=${page}&per_page=15`,
    {headers},
  );
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data?.introductions) ? data.introductions : [];

  return list.map((item: any) => {
    const rawContent = stripHtml(
      item.content?.rendered || item.content?.raw || '',
    );
    const isLong = rawContent.length > 180;
    const commentCount = item.comment_count ?? 0;

    return {
      id: item.id,
      slug: item.permalink?.split('/').filter(Boolean).pop() || String(item.id),
      content: isLong ? rawContent.slice(0, 180) : rawContent,
      fullContent: rawContent,
      truncated: isLong,
      time: item.date_formatted || formatDate(item.date),
      rawDate: item.date,
      commentCount,
      activityId: item.activity_id ?? null,
      likes: item.like_count ?? 0,
      liked: item.liked_by_me ?? false,
      canLike: true,
      comments: commentCount,
      canComment: true,
      likedBy: mapLikedBy(item.liked_by),
      embeddedComments: (item.comments || []).map((c: any) => ({
        id: c.id,
        author: {
          name: decodeEntities(c.author?.full_name || 'Member'),
          avatar:
            c.author?.avatar ||
            `https://www.gravatar.com/avatar/${c.author?.user_id || 0}?s=48&d=identicon`,
        },
        content: stripHtml(c.content?.rendered || c.content?.raw || ''),
        time: c.date_formatted || formatDate(c.date),
      })),
      author: {
        id: item.author?.user_id ?? 0,
        name: decodeEntities(item.author?.full_name || 'Member'),
        username: item.author?.profile_url?.split('/').filter(Boolean).pop() || '',
        avatar:
          item.author?.avatar ||
          `https://www.gravatar.com/avatar/${item.author?.user_id || item.id}?s=96&d=identicon`,
        title: decodeEntities(item.author?.job_title || item.author?.position || ''),
        flag: '',
        country: '',
      },
    };
  });
};

// Native WordPress comments for the 'introduction' CPT. NOT used for display
// anymore — getIntroductions() now returns comments embedded directly from
// /custom/v1/introductions. Kept only as a last-resort fallback and for
// legacy callers.
export const getIntroComments = async (postId: number): Promise<any[]> => {
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/wp/v2/comments?post=${postId}&per_page=50`,
    {headers},
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((c: any) => ({
    id: c.id,
    author: {
      name: decodeEntities(c.author_name || 'Member'),
      avatar:
        c.author_avatar_urls?.['48'] ||
        c.author_avatar_urls?.['96'] ||
        `https://www.gravatar.com/avatar/${c.author}?s=48&d=identicon`,
    },
    content: stripHtml(c.content?.rendered || ''),
    time: formatDate(c.date),
  }));
};

export const postIntroComment = async (
  postId: number,
  content: string,
): Promise<any> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/wp/v2/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({post: postId, content}),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`postIntroComment failed (${res.status}): ${body}`);
  }
  return res.json();
};


// Activity comments for the regular Feed (BuddyBoss activity_update posts) —
// distinct from getIntroComments above, which uses native WP comments for
// the 'introduction' custom post type.
export const getActivityComments = async (
  activityId: number,
): Promise<any[]> => {
  const headers = await authHeaders();
  const res = await fetchWithTimeout(
    `${BASE}/buddyboss/v1/activity/${activityId}/comment`,
    {headers},
  );
  if (!res.ok) return [];
  const data = await res.json();
  // The endpoint returns an object — { comment_count, level_comment_count,
  // comments: [...] } — not a flat array. Confirmed via Postman 2026-07-19.
  const list = Array.isArray(data) ? data : data?.comments;
  if (!Array.isArray(list)) return [];
  return list.map((c: any) => ({
    id: c.id,
    author: {
      name: decodeEntities(c.name || c.user_fullname || 'Member'),
      avatar:
        c.user_avatar?.thumb ||
        `https://www.gravatar.com/avatar/${c.user_id}?s=40&d=identicon`,
    },
    content: (() => {
      const rendered =
        typeof c.content === 'string' ? c.content : c.content?.rendered;
      return rendered
        ? stripHtml(rendered)
        : (c.content_stripped || '').replace(/\\(['"])/g, '$1');
    })(),
    time: formatDate(c.date),
    // Confirmed via Postman 2026-07-31: comments now carry the same
    // like_count/favorited/liked_by shape as posts — comments are BuddyBoss
    // activity records too, so the existing toggleLike(id)/LikedByScreen
    // both work unchanged by passing the comment's own id.
    likes: c.favorite_count ?? c.like_count ?? 0,
    liked: c.favorited ?? c.liked_by_me ?? false,
    likedBy: mapLikedBy(c.liked_by),
  }));
};

// Confirmed via Postman 2026-07-19: POST /buddyboss/v1/activity/{id}/comment
// returns HTTP 200/201 on success, but like the follow/favorite endpoints
// elsewhere in this file, fetch() does not throw on a 4xx/5xx response — it
// just resolves with an error body (e.g. {"code":"rest_forbidden",...}).
// Without checking res.ok, a failed comment post (expired token, closed
// thread, validation error) looked identical to success from the caller's
// side: IntrosScreen's handleSubmit() would clear the input and reload
// comments as if it worked, so the comment silently never appeared. This is
// the exact bug class already fixed for toggleLike/followMember/
// unfollowMember above — postActivityComment was the one mutation in this
// file that had been missed.
export const postActivityComment = async (
  activityId: number,
  content: string,
): Promise<any> => {
  const headers = await authHeaders();
  const res = await fetchWithTimeout(
    `${BASE}/buddyboss/v1/activity/${activityId}/comment`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({content}),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to post comment on activity ${activityId} (${res.status}): ${body}`);
  }
  const json = await res.json().catch(() => null);
  // Confirmed via a real device response, 2026-08-18: a successful POST
  // here returns {created: true, comments: [{...the new comment, with its
  // own id...}]} — the new comment is nested inside a `comments` array, NOT
  // a bare object with a top-level `id` like GET returns. The first version
  // of this check looked for json.id/json.comment_id directly, which never
  // matches this shape — so it was flagging every successful post as a
  // failure (the comment really was being created the whole time; only the
  // client-side validation was wrong).
  const created = Array.isArray(json?.comments) ? json.comments[0] : json;
  if (!json || (json.created !== true && !created?.id)) {
    throw new Error(`Comment endpoint returned no comment id: ${JSON.stringify(json)}`);
  }
  return created;
};

// NOTE: this endpoint has NOT been Postman-confirmed — it was already in the
// codebase before this session. fetch() only rejects on network failure, not
// on 4xx/5xx responses, so without checking res.ok a rejected/failed follow
// request looked identical to a successful one — the UI happily flipped to
// "following" while nothing changed server-side. That's the "works until you
// leave the screen" symptom: it was pure client-side optimism with no real
// backend confirmation, ever.
// Confirmed via GET /wp-json/ route discovery, 2026-07-31: the real one-way
// follow endpoint is POST /buddyboss/v1/members/action/{id} with body
// {"action": "follow"|"unfollow"} — a single member-actions route, not a
// dedicated /friendship or /follow sub-path (that guess was the earlier bug:
// it 404'd as rest_no_route, so nothing ever actually persisted).
// Confirmed via Postman 2026-07-31: this endpoint returns HTTP 200 even when
// the follow/unfollow itself did NOT happen — the real success signal is the
// "action" field in the response body (true = state changed, false = it
// didn't — e.g. calling "follow" while already following, or a genuine
// failure). Checking only res.ok was the exact same class of bug as the
// earlier wrong-endpoint issue: an HTTP-level "success" that isn't a real
// business-logic success. Now the body is parsed and data.is_following is
// used as the source of truth (it reflects the member's *actual* current
// state after the call, which is more reliable than trusting the "action"
// flag alone — e.g. a "follow" call on an already-followed member should
// still be treated as a success from the UI's point of view since the end
// state is correct, even though action itself is false there).
export const followMember = async (memberId: number): Promise<void> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/members/action/${memberId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({action: 'follow'}),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`followMember failed (${res.status}): ${body}`);
  }
  const json = await res.json().catch(() => null);
  if (json && json.data && json.data.is_following === false) {
    throw new Error('followMember: server did not actually follow this member');
  }
};

export const unfollowMember = async (memberId: number): Promise<void> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/buddyboss/v1/members/action/${memberId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({action: 'unfollow'}),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`unfollowMember failed (${res.status}): ${body}`);
  }
  const json = await res.json().catch(() => null);
  if (json && json.data && json.data.is_following === true) {
    throw new Error('unfollowMember: server did not actually unfollow this member');
  }
};

export const toggleFollow = async (
  memberId: number,
  following: boolean,
): Promise<void> => {
  following ? await unfollowMember(memberId) : await followMember(memberId);
};

// ─── Backward compat aliases ──────────────────────────────────────────────────
export const postComment = postActivityComment;
export const getComments = getActivityComments;
