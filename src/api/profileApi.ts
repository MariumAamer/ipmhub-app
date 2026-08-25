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

// ─── Welcome popup + introduction (replaces the old saveProfile +
// uploadAvatar + postIntroductionActivity flow) ───────────────────────────
// ROOT CAUSE (found 2026-08-18, confirmed by Robby 2026-08-24): the old flow
// posted the intro to /wp/v2/introduction, which most members' WP role
// (Subscriber) doesn't have publish_posts capability for — that write was
// silently rejected. Robby replaced the whole onboarding write path with a
// single dedicated pair of custom endpoints that handle permissions
// server-side:
//   GET  /custom/v1/welcome-intro/status  — whether to show the popup at all,
//        plus prefill values and whether the member already has an avatar
//        BuddyBoss can reuse.
//   POST /custom/v1/welcome-intro/submit  — one multipart write that saves
//        the profile fields AND creates the introduction post together, so
//        there's no longer a separate "did the intro actually post" step
//        that can fail independently of the profile save.

export interface WelcomeIntroPrefill {
  job: string;
  company: string;
  industry: string;
  country: string;
  phone: string;
  phone_country: string;
  linkedin: string;
}

export interface WelcomeIntroStatus {
  success: boolean;
  user_id: number;
  show_popup: boolean;
  already_submitted: boolean;
  can_use_existing_avatar: boolean;
  avatar_url: string;
  prefill: WelcomeIntroPrefill;
}

// ─── Check whether the welcome/intro popup should be shown ──────────────────
export const getWelcomeIntroStatus = async (
  userId: number,
): Promise<WelcomeIntroStatus | null> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('getWelcomeIntroStatus: no auth token available');
    }
    const res = await fetch(
      `${BASE}/custom/v1/welcome-intro/status?user_id=${userId}`,
      {headers: {Authorization: `Bearer ${token}`}},
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`welcome-intro/status failed (${res.status}): ${body}`);
    }
    return res.json();
  } catch (err) {
    console.log('getWelcomeIntroStatus error:', err);
    return null;
  }
};

export interface WelcomeIntroSubmitData {
  userId: number;
  job: string;
  company: string;
  industry: string;
  country: string;
  phone: string;
  phoneCountry: string;
  linkedin: string;
  bio: string;
  // Either photoUri (new upload) or useExistingAvatar (author reusing
  // avatar_url from the status call) should be set, not both.
  photoUri?: string | null;
  useExistingAvatar?: boolean;
}

// ─── Submit the welcome popup — saves the profile AND creates the
// introduction post in one write. Throws on any non-OK response so a
// caller-side failure (bad field, permission issue, etc.) is visible instead
// of silently vanishing like the old separate calls used to.
export const submitWelcomeIntro = async (
  data: WelcomeIntroSubmitData,
): Promise<void> => {
  const token = await getToken();
  if (!token) {
    throw new Error('submitWelcomeIntro: no auth token available');
  }

  const formData = new FormData();
  formData.append('user_id', String(data.userId));
  formData.append('job', data.job);
  formData.append('company', data.company);
  formData.append('industry', data.industry);
  formData.append('country', data.country);
  formData.append('phone', data.phone);
  formData.append('phone_country', data.phoneCountry);
  formData.append('linkedin', data.linkedin);
  formData.append('bio', data.bio);

  if (data.useExistingAvatar) {
    formData.append('use_existing_avatar', '1');
  } else if (data.photoUri) {
    formData.append('file', {
      uri: data.photoUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);
  }

  // Do NOT set Content-Type manually — RN's fetch needs to generate the
  // multipart boundary itself from the FormData body.
  const res = await fetch(`${BASE}/custom/v1/welcome-intro/submit`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${token}`},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.log(`submitWelcomeIntro failed (${res.status}):`, body);
    throw new Error(`Could not submit welcome intro (${res.status}): ${body}`);
  }
};
