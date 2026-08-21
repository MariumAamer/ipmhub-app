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

// ─── Post introduction (creates the actual Introductions CPT entry) ──────────
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
