/* eslint-disable prettier/prettier */
import {apiRequest, BASE_URL} from './apiClient';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
});

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

// NOTE: backend does not respect the page/per_page params on this endpoint
// — confirmed 2026-07 by requesting page=1 and page=2 directly and getting
// back the identical first 10 items both times. Fetching everything in one
// call and paginating client-side instead, until the backend is fixed.
export const getWebinarRecordings = async (): Promise<{recordings: WebinarRecordingItem[]}> => {
  try {
    const json = await apiRequest(`${BASE_URL}/custom/v1/webinar-recordings?per_page=100`);
    const items: any[] = Array.isArray(json) ? json : json.events ?? json.recordings ?? json.data ?? [];
    if (__DEV__) console.log('[eventsApi] webinars count:', items.length);
    return {recordings: items.map(mapRecording)};
  } catch (err) {
    console.error('[eventsApi] getWebinarRecordings', err);
    return {recordings: []};
  }
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
