/* eslint-disable prettier/prettier */
import {getToken} from './apiClient';
import * as Keychain from 'react-native-keychain';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── xProfile field IDs — confirmed from live site ───────────────────────────
export const XPROFILE_FIELDS = {
  FIRST_NAME: 1,
  LAST_NAME: 2,
  USERNAME: 3,
  PHONE: 1238,
  JOB_TITLE: 1097,
  COMPANY: 1187,
  INDUSTRY: 1162,
  LINKEDIN: 1098,
  COUNTRY: 1099,
  ABOUT_ME: 1100,
};

export interface ProfileData {
  jobTitle: string;
  company: string;
  industry: string;
  country: string;
  countryCode: string;
  phone: string;
  linkedIn: string;
  introduction: string;
}

// ─── Get user ID from stored token ───────────────────────────────────────────
// Decodes JWT payload to extract user ID (no library needed)
export const getUserIdFromToken = async (): Promise<number | null> => {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds) return null;
    const stored = JSON.parse(creds.password);

    // If we stored userId directly
    if (stored?.userId) return Number(stored.userId);

    // Decode JWT payload to get user ID
    const token = stored?.token;
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Number(payload?.data?.user?.id) || null;
  } catch {
    return null;
  }
};

// ─── Get my profile using real user ID ───────────────────────────────────────
// Uses /buddyboss/v1/members/{id} — confirmed working on your server
// Avoids /members/me which is not supported on all BuddyBoss versions
export const getMyProfile = async (): Promise<any> => {
  try {
    const token = await getToken();
    const userId = await getUserIdFromToken();

    if (!token || !userId) return null;

    // Try octopus user-info first (built for mobile app)
    const octopusRes = await fetch(`${BASE}/octopus-react/v1/user-info`, {
      headers: {Authorization: `Bearer ${token}`},
    });

    if (octopusRes.ok) {
      const octopusData = await octopusRes.json();
      if (octopusData?.id || octopusData?.user_id) {
        // Supplement with BuddyBoss member data for avatar/followers
        const memberRes = await fetch(
          `${BASE}/buddyboss/v1/members/${userId}`,
          {headers: {Authorization: `Bearer ${token}`}},
        );
        if (memberRes.ok) {
          const memberData = await memberRes.json();
          return {...octopusData, ...memberData};
        }
        return octopusData;
      }
    }

    // Fallback: direct BuddyBoss member endpoint with user ID
    const response = await fetch(`${BASE}/buddyboss/v1/members/${userId}`, {
      headers: {Authorization: `Bearer ${token}`},
    });

    if (!response.ok) return null;
    return response.json();
  } catch (err) {
    console.log('getMyProfile error:', err);
    return null;
  }
};

// ─── Update xProfile field ────────────────────────────────────────────────────
// NOTE: like every other write in this file, this used to swallow failures
// silently (bare `catch`, no `res.ok` check). fetch() only rejects on a
// genuine network error — a 401/403/422 from the server resolves normally,
// so without checking res.ok a rejected field update looked identical to a
// successful one from the caller's point of view. Now it throws with the
// status + response body so saveProfile() (and its caller) can actually see
// which field failed and why, instead of the field just silently not saving.
const updateField = async (
  fieldId: number,
  userId: number,
  value: string,
): Promise<void> => {
  if (!value?.trim()) return;
  const token = await getToken();
  if (!token) throw new Error(`updateField ${fieldId}: no auth token`);
  const res = await fetch(`${BASE}/buddyboss/v1/xprofile/${fieldId}/data/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({value}),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`xProfile field ${fieldId} update failed (${res.status}): ${body}`);
  }
};

// ─── Save full profile ────────────────────────────────────────────────────────
// Promise.allSettled means one field failing (e.g. a bad xprofile field id,
// an expired token, a permission error) never aborts the others — but it was
// also throwing every result away, settled or rejected, so a failed field
// update was invisible. Now rejected settlements are logged with the field
// they came from, so a failure here shows up in device logs instead of
// looking like the whole save silently worked.
export const saveProfile = async (
  userId: number,
  data: ProfileData,
): Promise<void> => {
  const fields: Array<[string, Promise<void>]> = [
    ['jobTitle', updateField(XPROFILE_FIELDS.JOB_TITLE, userId, data.jobTitle)],
    ['company', updateField(XPROFILE_FIELDS.COMPANY, userId, data.company)],
    ['industry', updateField(XPROFILE_FIELDS.INDUSTRY, userId, data.industry)],
    ['country', updateField(XPROFILE_FIELDS.COUNTRY, userId, data.country)],
    ['phone', updateField(XPROFILE_FIELDS.PHONE, userId, data.phone)],
    ['linkedIn', updateField(XPROFILE_FIELDS.LINKEDIN, userId, data.linkedIn)],
    ['introduction/aboutMe', updateField(XPROFILE_FIELDS.ABOUT_ME, userId, data.introduction)],
  ];
  const results = await Promise.allSettled(fields.map(([, p]) => p));
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.log(`saveProfile: ${fields[i][0]} failed —`, result.reason);
    }
  });
};

// ─── Upload avatar ────────────────────────────────────────────────────────────
export const uploadAvatar = async (
  imageUri: string,
): Promise<string | null> => {
  try {
    const token = await getToken();
    if (!token) return null;
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);
    const response = await fetch(`${BASE}/buddyboss/v1/members/me/avatar`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`},
      body: formData,
    });
    const result = await response.json();
    return result?.full || result?.thumb || null;
  } catch {
    return null;
  }
};

// ─── Welcome Intro config (confirmed via Postman 2026-08-28) ────────────────
// GET /custom/v1/welcome-intro/config returns the exact industries[] and
// countries[] strings the submit endpoint validates against. Fetched live
// here so the picker data never drifts from the server's list again.
export interface WelcomeIntroConfig {
  min_bio_length: number;
  example_bio: string;
  industries: string[];
  countries: string[];
  allowed_image_types: string[];
}

export const getWelcomeIntroConfig = async (): Promise<WelcomeIntroConfig | null> => {
  try {
    const token = await getToken();
    const res = await fetch(`${BASE}/custom/v1/welcome-intro/config`, {
      headers: token ? {Authorization: `Bearer ${token}`} : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

// Static snapshot of the confirmed countries[] list (2026-08-28), used as a
// fallback/validation set below. If getWelcomeIntroConfig() is wired in
// later, prefer its live response over this snapshot.
export const WELCOME_INTRO_COUNTRIES = [
  'Ireland', 'United Kingdom', 'Afghanistan', 'Albania', 'Algeria', 'Andorra',
  'Angola', 'Antigua & Deps', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
  'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia Herzegovina',
  'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina', 'Burundi',
  'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Rep',
  'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo',
  'Congo {Democratic Rep}', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
  'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala',
  'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Italy',
  'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kiribati', 'Korea North', 'Korea South', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
  'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar {Burma}',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua',
  'Niger', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russian Federation', 'Rwanda',
  'St Kitts & Nevis', 'St Lucia', 'Saint Vincent & the Grenadines', 'Samoa',
  'San Marino', 'Sao Tome & Principe', 'Saudi Arabia', 'Senegal', 'Serbia',
  'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain',
  'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga',
  'Trinidad & Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen',
  'Zambia', 'Zimbabwe',
];

// Maps countriesApi.ts's restcountries.com names (ISO/common names) to this
// config's older-style names, for the entries that actually differ. Only
// entries confirmed to diverge are listed — everything else passes through
// unchanged. NOT independently verified against a live restcountries.com
// response field-by-field, so resolveCountryForSubmission() below logs a
// warning for anything that still doesn't land in WELCOME_INTRO_COUNTRIES —
// watch adb logcat on first test pass and add any missed aliases here.
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  'North Korea': 'Korea North',
  'South Korea': 'Korea South',
  'Russia': 'Russian Federation',
  'Eswatini': 'Swaziland',
  'Czechia': 'Czech Republic',
  'Cabo Verde': 'Cape Verde',
  'Timor-Leste': 'East Timor',
  'DR Congo': 'Congo {Democratic Rep}',
  'Republic of the Congo': 'Congo',
  'North Macedonia': 'Macedonia',
  'Myanmar': 'Myanmar {Burma}',
  'São Tomé and Príncipe': 'Sao Tome & Principe',
  'Saint Kitts and Nevis': 'St Kitts & Nevis',
  'Saint Lucia': 'St Lucia',
  'Saint Vincent and the Grenadines': 'Saint Vincent & the Grenadines',
  'Central African Republic': 'Central African Rep',
  'Trinidad and Tobago': 'Trinidad & Tobago',
  'Antigua and Barbuda': 'Antigua & Deps',
  'Bosnia and Herzegovina': 'Bosnia Herzegovina',
};

export const resolveCountryForSubmission = (restCountriesName: string): string => {
  const resolved = COUNTRY_NAME_ALIASES[restCountriesName] || restCountriesName;
  if (!WELCOME_INTRO_COUNTRIES.includes(resolved)) {
    console.log(
      `resolveCountryForSubmission: "${restCountriesName}" (resolved: "${resolved}") not found in WELCOME_INTRO_COUNTRIES — submit will likely 422. Add an alias.`,
    );
  }
  return resolved;
};

// ─── Submit Welcome Intro (consolidated endpoint, replaces the 3-call flow) ──
// Robby fixed the introduction-posting bug server-side and replaced the old
// flow (uploadAvatar + saveProfile + postIntroductionActivity — 3 separate
// requests, any of which could silently fail) with a single multipart POST
// that saves the xprofile fields, uploads the photo, and creates the
// introduction post atomically. Confirmed working against the live site
// 2026-08-28.
//
// IMPORTANT — do not wire this to the current picker values as-is:
// 'industry' and 'country' must match the exact strings returned by
// GET /custom/v1/welcome-intro/config (industries[] / countries[]). The
// app's local INDUSTRIES list does NOT match Robby's server list — confirmed
// mismatch: local list has "Technology & Software", the config/example
// payload uses "Technology & Telecommunications". Verify the config
// response in Postman before wiring picker values through, per the
// Postman-first rule — do not guess these match.
export interface WelcomeIntroData {
  job: string;
  company: string;
  industry: string; // must match GET /welcome-intro/config → industries[]
  country: string; // must match GET /welcome-intro/config → countries[]
  phone: string;
  phoneCountry?: string;
  linkedIn: string;
  bio: string; // min 130 characters per Robby's spec
  photoUri?: string | null;
  useExistingAvatar?: boolean; // authors only — skips photo upload
}

export interface WelcomeIntroResult {
  success: boolean;
  message: string;
  user_id: number;
  introduction_id: number;
  activity_id: number;
  avatar_url: string;
  introduction: {
    id: number;
    activity_id: number;
    author: {
      user_id: number;
      full_name: string;
      avatar: string;
      profile_url: string;
      position: string;
      job_title: string;
      company: string;
    };
    permalink: string;
  };
}

export const submitWelcomeIntro = async (
  userId: number,
  data: WelcomeIntroData,
): Promise<WelcomeIntroResult> => {
  const token = await getToken();
  if (!token) {
    throw new Error('submitWelcomeIntro: no auth token available');
  }

  const formData = new FormData();
  formData.append('user_id', String(userId));
  formData.append('job', data.job);
  formData.append('company', data.company);
  formData.append('industry', data.industry);
  formData.append('country', data.country);
  formData.append('phone', data.phone);
  if (data.phoneCountry) formData.append('phone_country', data.phoneCountry);
  formData.append('linkedin', data.linkedIn);
  formData.append('bio', data.bio);

  if (data.useExistingAvatar) {
    formData.append('use_existing_avatar', 'true');
  } else if (data.photoUri) {
    formData.append('file', {
      uri: data.photoUri,
      type: 'image/jpeg',
      name: 'profile-photo.jpg',
    } as any);
  }

  // Do NOT set a Content-Type header manually — RN's fetch generates the
  // multipart boundary itself from the FormData instance. Robby's spec
  // literally lists "Content-Type": "multipart/form-data" as a header, but
  // setting that by hand breaks the boundary and the server can't parse the
  // parts (same pattern already avoided in uploadAvatar() above).
  const res = await fetch(`${BASE}/custom/v1/welcome-intro/submit`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${token}`},
    body: formData,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    console.log(`submitWelcomeIntro failed (${res.status}):`, body);
    throw new Error(
      `Could not submit introduction (${res.status}): ${
        body?.message || 'unknown error'
      }`,
    );
  }
  return body;
};

// ─── Post introduction (creates the actual Introductions CPT entry) ──────────
// DEPRECATED as of 2026-08-28 — replaced by submitWelcomeIntro() above.
// Kept only in case anything else still references it; safe to delete once
// ProfileSetupScreen is confirmed migrated.
// Confirmed via the site's own /wp-json/ route index (2026-08-08): there is
// NO create route on /custom/v1/introductions (GET only) — but /wp/v2/introduction
// is a standard WordPress custom post type with full core REST support,
// including POST. This IS the real creation endpoint.
//
// Previously this posted to /buddyboss/v1/activity instead, which is why
// intros were showing up on the Feed screen instead of the Intros screen —
// that was always the wrong endpoint, not a display bug.
//
// title is intentionally omitted — confirmed not required by the route
// schema, and IntrosScreen/getIntroductions never reads a title field, only
// content.
//
// THE ACTUAL BUG (found 2026-08-18): this function never checked res.ok and
// wrapped everything in a bare `catch {}`. fetch() resolves normally on a
// 4xx/5xx — it only rejects on a network-level failure — so ANY server-side
// rejection of the POST (most likely: the authenticated member's WP role
// lacks publish_posts/edit_posts capability for the 'introduction' CPT,
// since most community-site members are Subscribers, not Authors/Editors —
// a very plausible reason status:'publish' would be silently rejected here)
// resolved as if it had succeeded. The onboarding flow then proceeded straight
// to the congratulations screen with no error, which is exactly the reported
// symptom: profile info saves fine, but the "About yourself" introduction
// never shows up on the Intros screen. Now this throws with the response
// status + body on any non-OK response, so the caller can actually see (and
// the user can be told) that the post failed, instead of it vanishing
// silently. If server logs/Postman confirm this is in fact a capability
// (403) issue, the real fix is granting the 'introduction' CPT's publish
// capability to the member role on the WordPress side — this client-side
// change only makes that failure visible instead of hidden.
export const postIntroductionActivity = async (
  content: string,
): Promise<void> => {
  const token = await getToken();
  if (!token) {
    throw new Error('postIntroductionActivity: no auth token available');
  }
  const res = await fetch(`${BASE}/wp/v2/introduction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content,
      status: 'publish',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.log(`postIntroductionActivity failed (${res.status}):`, body);
    throw new Error(
      `Could not publish introduction (${res.status}). This usually means the ` +
        `signed-in member's role doesn't have permission to publish the ` +
        `'introduction' post type on the server.`,
    );
  }
};
