/* eslint-disable prettier/prettier */
import {apiRequest, BASE_URL} from './apiClient';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Webinar tag taxonomy ───────────────────────────────────────────────────
// CONFIRMED (Sep 2026) — these are the only 5 real tags on the backend.
// The Figma filter-sheet mockup originally listed 8 different placeholder
// topics (Agile, Sustainability, Digital Transformation, etc.) that don't
// exist as tags at all — tags=agile,sustainability returned 0 results when
// tested. Marium confirmed via a screenshot of the live tag-search dropdown
// that these 5 are correct; the checkbox sheet UI itself is unchanged, only
// the data backing it.
export interface WebinarTag {
  id: number;
  name: string;
  slug: string;
}
export const WEBINAR_TAGS: WebinarTag[] = [
  {id: 449, name: 'AI & Technology',       slug: 'ai-technology'},
  {id: 448, name: 'Communication',          slug: 'communication'},
  {id: 447, name: 'Leadership & Influence', slug: 'leadership-influence'},
  {id: 451, name: 'People & Change',        slug: 'people-change'},
  {id: 450, name: 'Team Management',        slug: 'team-management'},
];

export type WebinarSort = 'recent' | 'older';
// CONFIRMED (Sep 2026) — exactly 2 sort options, shown in a bottom sheet
// with the same visual treatment as the filter sheet (Marium's note).
export const WEBINAR_SORT_OPTIONS: {value: WebinarSort; label: string}[] = [
  {value: 'recent', label: 'Most Recent'},
  {value: 'older',  label: 'Older'},
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EventItem {
  rawEvent?: any;
  id: string;
  title: string;
  date: string;
  dateLabel: string;
  speakerName: string;
  speakerTitle: string;
  image: string | null;
  bannerImage: string | null;
  detailsImage: string | null;
  registrationUrl: string | null;
  permalink: string | null;
  aboutWebinar: string;
  isPast: boolean;
}

export interface WebinarRecordingItem {
  id: string;
  title: string;
  date: string;
  dateLabel: string;
  speakerName: string;
  speakerTitle: string;
  image: string | null;
  recordingUrl: string | null;
  tagSlugs: string[];
}

// ─── Single-webinar detail — CONFIRMED via Postman (Sep 2026, event_id
// 107005). The response wraps a `webinar` object plus three sibling blocks
// (latest_webinars, recommended_course, sidebar) that the detail screen's
// Figma DOES use (Latest Webinars list, Recommended Course card, and the
// Join the Community / Explore Resources cards respectively) — confirmed
// against the 4 detail-screen screenshots Marium shared.
export interface WebinarSpeakerLinkedIn {
  loading: boolean;
  url: string | null; // null once loaded with nothing found -> button disabled
}

export interface RelatedWebinarItem {
  id: string;
  title: string;
  dateLabel: string;
  speakerName: string;
  speakerTitle: string;
  image: string | null;
}

export interface SidebarCardData {
  title: string;
  description: string;
  url: string;
}

export interface RecommendedCourseCardData {
  id: number;
  title: string;
  permalink: string;
  image: string;
  description: string;
}

export interface WebinarDetail {
  id: string;
  title: string;
  dateLabel: string;
  durationLabel: string;
  tagName: string;
  speakerName: string;
  speakerTitle: string;
  speakerImage: string | null;
  speakerBioText: string;
  speakerProfileUrl: string | null;
  speakerUserId: number | null;
  videoEmbedUrl: string | null;
  videoWatchUrl: string | null;
  shareUrl: string | null; // permalink — the public page to share/copy
  aboutVisible: string[];
  aboutHidden: string[];
  recommendedCourse: RecommendedCourseCardData | null;
  sidebarForums: SidebarCardData | null;
  sidebarResources: SidebarCardData | null;
  latestWebinars: RelatedWebinarItem[];
  allCoursesUrl: string | null;
  recordingsUrl: string | null;
}


export interface EventRegistrationPayload {
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  job_title: string;
  event_id: string;
  region: string;
}

export interface EventRegistrationResult {
  success: boolean;
  message: string;
}

interface GetEventsResult {
  events: EventItem[];
  pastEvents: EventItem[];
  hasMore: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const formatDateLabel = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const toUrl = (val: any): string | null => {
  if (!val || typeof val !== 'string') return null;
  return val;
};

// WordPress entity-encodes titles/names coming through this API (e.g.
// "How AI is Disrupting Project Management &#8211; Opportunit..." was
// showing the raw "&#8211;" instead of an en dash) — same pattern already
// used in mentorsApi.ts / resourcesApi.ts for the same reason.
const decodeEntities = (str: string): string =>
  str
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&nbsp;/g, ' ');

const getStoredUserId = async (): Promise<string> => {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds) return '';
    const user = JSON.parse(creds.password);
    return String(user?.id ?? user?.userId ?? user?.user_id ?? '');
  } catch { return ''; }
};

// ─── xProfile parsing (same pattern as MemberProfileScreen) ──────────────────
// company / job_title / region are collected on account creation and live on
// the user's xProfile, not in the Keychain auth blob — so registration
// defaults are pulled from the member endpoint, not guessed.
// Confirmed field IDs: 1 = First Name, 2 = Last Name, 1097 = Job Title,
// 1187 = Company, 1099 = Country.
//
// Confirmed live response shape (2026-07-06):
// xprofile.groups = { "1": { name, fields: { "1": {name, value:{raw,...}},
// "1097": {name, value:{raw,...}}, ... } }, ... } — fields is an object
// KEYED BY FIELD ID; the field itself has NO "id" property. The previous
// version checked field.id (which never exists) instead of using the
// object key, so it silently produced an empty map on every real profile.
const parseXprofile = (xprofile: any): Record<string, string> => {
  const raw = xprofile?.groups || xprofile;
  if (!raw || typeof raw !== 'object') return {};
  const map: Record<string, string> = {};
  for (const gKey of Object.keys(raw)) {
    const group = raw[gKey];
    const fields = group?.fields;
    if (!fields || typeof fields !== 'object') continue;
    for (const fieldId of Object.keys(fields)) {
      const field = fields[fieldId];
      if (!field || typeof field !== 'object') continue;
      const val = (field?.value?.raw && String(field.value.raw).trim())
        || (typeof field?.value === 'string' ? field.value.trim() : '');
      if (val) map[`field_${fieldId}`] = val;
    }
  }
  return map;
};

export const getStoredUserFields = async (): Promise<Partial<EventRegistrationPayload>> => {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds) return {};
    const user = JSON.parse(creds.password);
    const email  = user?.email ?? user?.user_email ?? '';
    const userId = user?.id ?? user?.userId ?? user?.user_id;

    // Fallback if xProfile fetch fails — split displayName so first/last
    // aren't left blank on the registration payload.
    const nameParts = String(user?.displayName ?? '').trim().split(/\s+/).filter(Boolean);
    const fallback: Partial<EventRegistrationPayload> = {
      first_name: nameParts[0] ?? '',
      last_name:  nameParts.slice(1).join(' ') ?? '',
      email,
    };

    if (!userId) return fallback;

    try {
      const res = await apiRequest(`${BASE_URL}/buddyboss/v1/members/${userId}?xprofile=1`);
      const xmap = parseXprofile(res?.xprofile);

      return {
        first_name: xmap['field_1']    || fallback.first_name,
        last_name:  xmap['field_2']    || fallback.last_name,
        email,
        job_title:  xmap['field_1097'] || '',
        company:    xmap['field_1187'] || '',
        region:     xmap['field_1099'] || '',
      };
    } catch {
      return fallback;
    }
  } catch {
    return {};
  }
};

// ─── Local registration state ─────────────────────────────────────────────────
const REGISTERED_KEY = 'ipm_registered_events';

export const getRegisteredEventIds = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(REGISTERED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const markEventRegistered = async (eventId: string): Promise<void> => {
  try {
    const existing = await getRegisteredEventIds();
    if (!existing.includes(eventId)) {
      await AsyncStorage.setItem(REGISTERED_KEY, JSON.stringify([...existing, eventId]));
    }
  } catch {}
};

const PAGE_SIZE = 10;

// ─── Field mapping ─────────────────────────────────────────────────────────────
// Updated API fields (confirmed from live endpoint):
// about_webinar: string (webinar description)
// speaker_bio: string (speaker bio)
// event_details_image: URL (card image)
// header_banner_image: URL (landscape banner)
// image_url: URL (fallback)
// main_image: URL (speaker headshot)

const mapEvent = (raw: any, isPast = false): EventItem => ({
  id:              String(raw.id ?? raw.zoho_event_id ?? ''),
  title:           decodeEntities(raw.title ?? ''),
  date:            raw.event_time ?? '',
  dateLabel:       raw.event_date_formatted ?? formatDateLabel(raw.event_time ?? ''),
  speakerName:     decodeEntities(raw.speaker ?? ''),
  speakerTitle:    decodeEntities(raw.job_title ?? ''),
  // Card thumbnail: main_image confirmed to match the Hub website exactly
  // (2026-07-06). header_banner_image was previously checked first, but it
  // can hold a different image than what's shown on the website (confirmed
  // on a real event) — that mismatch was the root cause of app images not
  // matching Hub. Kept as a last-resort fallback only, not the primary.
  image:           toUrl(raw.main_image) ?? toUrl(raw.image_url) ?? toUrl(raw.header_banner_image) ?? null,
  // 16:9 banner for ThankYou screen — same fix, same reasoning.
  bannerImage:     toUrl(raw.main_image) ?? toUrl(raw.image_url) ?? toUrl(raw.header_banner_image) ?? null,
  // Detail card image (main_image confirmed correct; event_details_image
  // kept first only because it's more likely to be a purpose-built crop for
  // this card size — revisit if it turns out to have the same staleness
  // issue header_banner_image had).
  detailsImage:    toUrl(raw.event_details_image) ?? toUrl(raw.main_image) ?? toUrl(raw.image_url) ?? null,
  registrationUrl: isPast ? (raw.recording_link || null) : (raw.cta_url || null),
  permalink:       toUrl(raw.permalink) ?? null,
  // about_webinar is now a string (not array)
  aboutWebinar:    typeof raw.about_webinar === 'string'
    ? raw.about_webinar.trim()
    : Array.isArray(raw.about_webinar) ? raw.about_webinar.join('\n\n') : '',
  isPast,
  rawEvent: raw,
});

const mapRecording = (raw: any): WebinarRecordingItem => ({
  id:           String(raw.id ?? raw.zoho_event_id ?? raw.video_id ?? raw.recording_link ?? raw.title ?? ''),
  title:        decodeEntities(raw.title ?? ''),
  date:         raw.event_time ?? '',
  dateLabel:    raw.event_date_formatted ?? formatDateLabel(raw.event_time ?? ''),
  speakerName:  decodeEntities(raw.speaker ?? ''),
  speakerTitle: decodeEntities(raw.job_title ?? ''),
  // Webinar Recordings uses header_banner_image as the primary source
  // (confirmed 2026-07-06) — distinct from mapEvent above, which uses
  // main_image. Different sections of the app intentionally pull from
  // different image fields.
  image:        toUrl(raw.header_banner_image) ?? toUrl(raw.main_image) ?? toUrl(raw.image_url) ?? null,
  recordingUrl: raw.recording_link || null,
  tagSlugs:     Array.isArray(raw.tag_slugs) ? raw.tag_slugs : [],
});

// json = the FULL /single-webinar response ({success, webinar,
// latest_webinars, recommended_course, sidebar}), not just the webinar
// object — recommended_course/sidebar/latest_webinars are siblings of
// `webinar` in the confirmed response, not nested inside it.
const mapWebinarDetail = (json: any): WebinarDetail => {
  const w = json?.webinar ?? {};
  return {
    id:                String(w.id ?? ''),
    title:             decodeEntities(w.title ?? ''),
    dateLabel:         w.event_date_formatted ?? formatDateLabel(w.event_time ?? ''),
    durationLabel:     w.duration_label ?? '',
    tagName:           decodeEntities(w.tag_name ?? w.tags?.[0]?.name ?? ''),
    speakerName:       decodeEntities(w.speaker ?? ''),
    speakerTitle:      decodeEntities(w.job_title ?? ''),
    speakerImage:      toUrl(w.speaker_image) ?? toUrl(w.main_image) ?? null,
    speakerBioText:    decodeEntities(w.speaker_bio_text ?? (Array.isArray(w.speaker_bio) ? w.speaker_bio.join('\n\n') : '')),
    speakerProfileUrl: toUrl(w.speaker_profile_url),
    speakerUserId:     typeof w.speaker_user_id === 'number' ? w.speaker_user_id : null,
    videoEmbedUrl:     toUrl(w.video_embed_url),
    videoWatchUrl:     toUrl(w.video_url) ?? toUrl(w.recording_link),
    shareUrl:          toUrl(w.permalink) ?? toUrl(w.single_webinar_url),
    aboutVisible:      Array.isArray(w.about_visible) ? w.about_visible : (Array.isArray(w.about_webinar) ? w.about_webinar : (w.about_webinar ? [w.about_webinar] : [])),
    aboutHidden:       Array.isArray(w.about_hidden) ? w.about_hidden : [],
    recommendedCourse: json?.recommended_course ? {
      id:          json.recommended_course.id,
      title:       decodeEntities(json.recommended_course.title ?? ''),
      permalink:   json.recommended_course.permalink ?? '',
      image:       json.recommended_course.image ?? '',
      description: decodeEntities(json.recommended_course.description ?? ''),
    } : null,
    sidebarForums: json?.sidebar?.forums ? {
      title:       decodeEntities(json.sidebar.forums.title ?? ''),
      description: decodeEntities(json.sidebar.forums.description ?? ''),
      url:         json.sidebar.forums.url ?? '',
    } : null,
    sidebarResources: json?.sidebar?.resources ? {
      title:       decodeEntities(json.sidebar.resources.title ?? ''),
      description: decodeEntities(json.sidebar.resources.description ?? ''),
      url:         json.sidebar.resources.url ?? '',
    } : null,
    latestWebinars: Array.isArray(json?.latest_webinars) ? json.latest_webinars.map((r: any) => ({
      id:           String(r.id ?? ''),
      title:        decodeEntities(r.title ?? ''),
      dateLabel:    r.event_date_formatted ?? formatDateLabel(r.event_time ?? ''),
      speakerName:  decodeEntities(r.speaker ?? ''),
      speakerTitle: decodeEntities(r.job_title ?? ''),
      image:        toUrl(r.header_banner_image) ?? toUrl(r.main_image) ?? toUrl(r.image_url) ?? null,
    })) : [],
    allCoursesUrl:  toUrl(w.all_courses_url),
    recordingsUrl:  toUrl(w.recordings_url),
  };
};

// ─── API calls ────────────────────────────────────────────────────────────────
export const getRecommendedEvents = async (page = 1): Promise<{events: EventItem[]; hasMore: boolean}> => {
  try {
    const json = await apiRequest(`${BASE_URL}/custom/v1/recommended-upcoming-events?page=${page}&per_page=${PAGE_SIZE}`);
    const items: any[] = Array.isArray(json) ? json : json.events ?? json.data ?? [];
    if (__DEV__) console.log('[eventsApi] upcoming count:', items.length, 'raw[0]:', JSON.stringify(items[0])?.slice(0, 200));
    return {events: items.map(e => mapEvent(e, false)), hasMore: items.length === PAGE_SIZE};
  } catch (err) {
    console.error('[eventsApi] getRecommendedEvents', err);
    return {events: [], hasMore: false};
  }
};

export const getPastEventRecordings = async (userId: string, page = 1): Promise<{events: EventItem[]; hasMore: boolean}> => {
  if (!userId) return {events: [], hasMore: false};
  try {
    const json = await apiRequest(`${BASE_URL}/custom/v1/past-event-recordings?user_id=${userId}&page=${page}&per_page=${PAGE_SIZE}`);
    const items: any[] = Array.isArray(json) ? json : json.events ?? json.data ?? [];
    return {events: items.map(e => mapEvent(e, true)), hasMore: items.length === PAGE_SIZE};
  } catch (err) {
    console.error('[eventsApi] getPastEventRecordings', err);
    return {events: [], hasMore: false};
  }
};

// UPDATED (Sep 2026) — the backend now supports search/tags/sort on this
// endpoint, and CONFIRMED (via Marium's cc=0-result test filtering
// tags=agile,sustainability) that `tags` genuinely filters server-side —
// unlike page/per_page, which stayed unverified this round: every sample
// response happened to have count === per_page, so it's not clear per_page
// actually caps anything rather than just echoing the filtered total back.
// Playing it safe and NOT passing page/per_page — request everything
// matching the filters in one call, same client-side "reveal N at a time"
// pattern already used for the list (see recordingsVisibleCount in
// EventsScreen), rather than trusting a param that may silently no-op the
// way page did on the old endpoint.
export interface GetWebinarRecordingsParams {
  search?: string;
  tags?: string[]; // slugs, e.g. ['leadership-influence']
  sort?: WebinarSort;
}

export const getWebinarRecordings = async (
  params: GetWebinarRecordingsParams = {},
): Promise<{recordings: WebinarRecordingItem[]; total: number}> => {
  try {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.tags && params.tags.length > 0) qs.set('tags', params.tags.join(','));
    qs.set('sort', params.sort ?? 'recent');

    const json = await apiRequest(`${BASE_URL}/custom/v1/webinar-recordings?${qs.toString()}`);
    const items: any[] = Array.isArray(json) ? json : json.events ?? json.webinars ?? json.data ?? [];
    // total/count CONFIRMED backend-driven (Sep 2026) — matches Marium's
    // "48 Webinars" / "18 Webinars" screenshots exactly, not a client count.
    const total = typeof json?.total === 'number' ? json.total
      : typeof json?.count === 'number' ? json.count
      : items.length;
    if (__DEV__) console.log('[eventsApi] webinars count:', items.length, 'total:', total);
    return {recordings: items.map(mapRecording), total};
  } catch (err) {
    console.error('[eventsApi] getWebinarRecordings', err);
    return {recordings: [], total: 0};
  }
};

// GET /wp-json/custom/v1/single-webinar?event_id={id} — CONFIRMED (Sep
// 2026, event_id=107005). Returns the full detail screen's data in one
// call: webinar object + latest_webinars/recommended_course/sidebar
// siblings (all three used by the detail screen — see mapWebinarDetail).
export const getSingleWebinar = async (eventId: string | number): Promise<WebinarDetail | null> => {
  try {
    const json = await apiRequest(`${BASE_URL}/custom/v1/single-webinar?event_id=${eventId}`);
    if (!json?.webinar) return null;
    return mapWebinarDetail(json);
  } catch (err) {
    console.error('[eventsApi] getSingleWebinar', err);
    return null;
  }
};

// Speaker's LinkedIn for the "Connect on LinkedIn" button on the webinar
// detail screen. The /single-webinar response has NO LinkedIn field —
// only speaker_profile_url (the Hub member page, not LinkedIn) — so this
// makes a second, separate call using speaker_user_id, reusing the exact
// confirmed endpoint + field ID already working on MemberProfileScreen
// (GET /buddyboss/v1/members/{id}?xprofile=1, field 1098 = LinkedIn).
// Returns null (button disabled) if the speaker never filled that field in
// — per Marium, no fallback to speaker_profile_url in that case.
export const getSpeakerLinkedIn = async (userId: number): Promise<string | null> => {
  if (!userId) return null;
  try {
    const res = await apiRequest(`${BASE_URL}/buddyboss/v1/members/${userId}?xprofile=1`);
    const xmap = parseXprofile(res?.xprofile);
    const raw = xmap['field_1098'];
    if (!raw) return null;
    return raw.startsWith('http') ? raw : `https://${raw}`;
  } catch (err) {
    console.error('[eventsApi] getSpeakerLinkedIn', err);
    return null;
  }
};

// ─── Local "saved" webinar state ──────────────────────────────────────────
// No backend field for this yet (confirmed nothing in the single-webinar
// response represents a saved/bookmarked state) — same local-AsyncStorage
// pattern already used for event registration above, toggle-based since
// "Save" is a toggle rather than a one-way action like registering.
const SAVED_WEBINARS_KEY = 'ipm_saved_webinars';

export const getSavedWebinarIds = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_WEBINARS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const toggleSavedWebinar = async (webinarId: string): Promise<boolean> => {
  try {
    const existing = await getSavedWebinarIds();
    const isSaved = existing.includes(webinarId);
    const next = isSaved ? existing.filter(id => id !== webinarId) : [...existing, webinarId];
    await AsyncStorage.setItem(SAVED_WEBINARS_KEY, JSON.stringify(next));
    return !isSaved; // returns the NEW saved state
  } catch { return false; }
};

export const getEvents = async (page = 1): Promise<GetEventsResult> => {
  const userId = await getStoredUserId();
  const [upcoming, past] = await Promise.all([
    getRecommendedEvents(page),
    getPastEventRecordings(userId, page),
  ]);
  return {events: upcoming.events, pastEvents: past.events, hasMore: upcoming.hasMore || past.hasMore};
};

export const registerForEvent = async (payload: EventRegistrationPayload): Promise<EventRegistrationResult> => {
  try {
    const json = await apiRequest(`${BASE_URL}/custom/v1/register-event`, 'POST', payload);
    // TEMP DEBUG — remove once the missing-email issue is resolved.
    console.log('[eventsApi] register-event payload:', JSON.stringify(payload));
    console.log('[eventsApi] register-event response:', JSON.stringify(json));
    // NOTE: local "registered" persistence is handled by the caller via
    // markEventRegistered(event.id) — payload.event_id is the Zoho event
    // ID (required by the backend/Zoho call) and does NOT match the local
    // WP post id used everywhere else to check registration state.
    return {success: true, message: json?.message ?? 'You have been registered successfully!'};
  } catch (err: any) {
    // TEMP DEBUG — remove once the missing-email issue is resolved.
    console.log('[eventsApi] register-event error:', JSON.stringify(err?.message ?? err));
    return {success: false, message: err?.message ?? 'Registration failed. Please try again.'};
  }
};
