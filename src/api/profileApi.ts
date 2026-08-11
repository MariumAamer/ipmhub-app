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
const updateField = async (
  fieldId: number,
  userId: number,
  value: string,
): Promise<void> => {
  if (!value?.trim()) return;
  const token = await getToken();
  if (!token) return;
  try {
    await fetch(`${BASE}/buddyboss/v1/xprofile/${fieldId}/data/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({value}),
    });
  } catch (err) {
    console.log(`xProfile ${fieldId} error:`, err);
  }
};

// ─── Save full profile ────────────────────────────────────────────────────────
export const saveProfile = async (
  userId: number,
  data: ProfileData,
): Promise<void> => {
  await Promise.allSettled([
    updateField(XPROFILE_FIELDS.JOB_TITLE, userId, data.jobTitle),
    updateField(XPROFILE_FIELDS.COMPANY, userId, data.company),
    updateField(XPROFILE_FIELDS.INDUSTRY, userId, data.industry),
    updateField(XPROFILE_FIELDS.COUNTRY, userId, data.country),
    updateField(XPROFILE_FIELDS.PHONE, userId, data.phone),
    updateField(XPROFILE_FIELDS.LINKEDIN, userId, data.linkedIn),
    updateField(XPROFILE_FIELDS.ABOUT_ME, userId, data.introduction),
  ]);
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
// Using standard wp_insert_post() via this core REST route fires the same
// save_post hooks a normal website intro submission would, which is what's
// expected to create the linked BuddyBoss activity_id that
// GET /custom/v1/introductions already returns for web-submitted intros —
// worth confirming this linkage actually appears on the next real test.
export const postIntroductionActivity = async (
  content: string,
): Promise<void> => {
  try {
    const token = await getToken();
    if (!token) return;
    await fetch(`${BASE}/wp/v2/introduction`, {
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
  } catch {}
};
