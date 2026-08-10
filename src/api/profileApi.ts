/* eslint-disable prettier/prettier */
import {getToken} from './apiClient';
import * as Keychain from 'react-native-keychain';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── Hermes-safe base64 decode (atob not available in React Native) ───────
// NEVER use atob() — throws on Hermes/Android, which was silently caught
// by getUserIdFromToken's catch block below and made it always return null
// on-device (worked fine on debug tooling that isn't Hermes, which is how
// this went unnoticed). Same helper as authApi.ts/forumsApi.ts/
// ProfileDrawer.tsx/CreatePostScreen.tsx — keep in sync if it ever changes.
const b64decode = (str: string): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  const s = str.replace(/[^A-Za-z0-9+/=]/g, '');
  for (let i = 0; i < s.length; ) {
    const e1 = chars.indexOf(s[i++]),
      e2 = chars.indexOf(s[i++]);
    const e3 = chars.indexOf(s[i++]),
      e4 = chars.indexOf(s[i++]);
    const c1 = (e1 << 2) | (e2 >> 4);
    const c2 = ((e2 & 15) << 4) | (e3 >> 2);
    const c3 = ((e3 & 3) << 6) | e4;
    output += String.fromCharCode(c1);
    if (e3 !== 64) output += String.fromCharCode(c2);
    if (e4 !== 64) output += String.fromCharCode(c3);
  }
  return output;
};

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
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(b64decode(padded));
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

// ─── Post introduction to activity feed ──────────────────────────────────────
export const postIntroductionActivity = async (
  content: string,
): Promise<void> => {
  try {
    const token = await getToken();
    if (!token) return;
    await fetch(`${BASE}/buddyboss/v1/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        type: 'activity_update',
        component: 'activity',
      }),
    });
  } catch {}
};
