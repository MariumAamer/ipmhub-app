/* eslint-disable prettier/prettier */
import {getToken} from './feedApi';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── World timezone list ──────────────────────────────────────────────────
// Hardcoded rather than using Intl.supportedValuesOf('timeZone') since that
// API's availability in Hermes varies by RN version/build and isn't
// guaranteed — a static list works identically on every device.
export interface TimezoneOption {
  id: string;
  label: string;
  offsetMinutes: number;
}

const TZ_RAW: Array<[string, number]> = [
  ['(UTC-12:00) Etc/GMT+12', -720],
  ['(UTC-11:00) Pacific/Midway', -660],
  ['(UTC-11:00) Pacific/Niue', -660],
  ['(UTC-10:00) Pacific/Honolulu', -600],
  ['(UTC-10:00) Pacific/Tahiti', -600],
  ['(UTC-09:30) Pacific/Marquesas', -570],
  ['(UTC-09:00) America/Anchorage', -540],
  ['(UTC-09:00) Pacific/Gambier', -540],
  ['(UTC-08:00) America/Los_Angeles', -480],
  ['(UTC-08:00) America/Tijuana', -480],
  ['(UTC-08:00) America/Vancouver', -480],
  ['(UTC-07:00) America/Denver', -420],
  ['(UTC-07:00) America/Phoenix', -420],
  ['(UTC-07:00) America/Chihuahua', -420],
  ['(UTC-06:00) America/Chicago', -360],
  ['(UTC-06:00) America/Mexico_City', -360],
  ['(UTC-06:00) America/Guatemala', -360],
  ['(UTC-05:00) America/New_York', -300],
  ['(UTC-05:00) America/Toronto', -300],
  ['(UTC-05:00) America/Bogota', -300],
  ['(UTC-05:00) America/Lima', -300],
  ['(UTC-04:30) America/Caracas', -270],
  ['(UTC-04:00) America/Halifax', -240],
  ['(UTC-04:00) America/Santiago', -240],
  ['(UTC-04:00) America/Santo_Domingo', -240],
  ['(UTC-03:30) America/St_Johns', -210],
  ['(UTC-03:00) America/Sao_Paulo', -180],
  ['(UTC-03:00) America/Buenos_Aires', -180],
  ['(UTC-03:00) America/Montevideo', -180],
  ['(UTC-02:00) America/Noronha', -120],
  ['(UTC-01:00) Atlantic/Azores', -60],
  ['(UTC-01:00) Atlantic/Cape_Verde', -60],
  ['(UTC+00:00) Europe/London', 0],
  ['(UTC+00:00) Africa/Casablanca', 0],
  ['(UTC+00:00) Atlantic/Reykjavik', 0],
  ['(UTC+00:00) UTC', 0],
  ['(UTC+01:00) Europe/Jersey', 60],
  ['(UTC+01:00) Europe/Paris', 60],
  ['(UTC+01:00) Europe/Berlin', 60],
  ['(UTC+01:00) Europe/Madrid', 60],
  ['(UTC+01:00) Europe/Rome', 60],
  ['(UTC+01:00) Africa/Lagos', 60],
  ['(UTC+02:00) Europe/Athens', 120],
  ['(UTC+02:00) Europe/Helsinki', 120],
  ['(UTC+02:00) Africa/Cairo', 120],
  ['(UTC+02:00) Africa/Johannesburg', 120],
  ['(UTC+02:00) Europe/Kyiv', 120],
  ['(UTC+03:00) Europe/Moscow', 180],
  ['(UTC+03:00) Africa/Nairobi', 180],
  ['(UTC+03:00) Asia/Baghdad', 180],
  ['(UTC+03:00) Asia/Riyadh', 180],
  ['(UTC+03:30) Asia/Tehran', 210],
  ['(UTC+04:00) Asia/Dubai', 240],
  ['(UTC+04:00) Asia/Baku', 240],
  ['(UTC+04:30) Asia/Kabul', 270],
  ['(UTC+05:00) Asia/Karachi', 300],
  ['(UTC+05:00) Asia/Tashkent', 300],
  ['(UTC+05:00) Asia/Yekaterinburg', 300],
  ['(UTC+05:30) Asia/Kolkata', 330],
  ['(UTC+05:30) Asia/Colombo', 330],
  ['(UTC+05:45) Asia/Kathmandu', 345],
  ['(UTC+06:00) Asia/Dhaka', 360],
  ['(UTC+06:00) Asia/Almaty', 360],
  ['(UTC+06:30) Asia/Yangon', 390],
  ['(UTC+07:00) Asia/Bangkok', 420],
  ['(UTC+07:00) Asia/Jakarta', 420],
  ['(UTC+07:00) Asia/Ho_Chi_Minh', 420],
  ['(UTC+08:00) Asia/Shanghai', 480],
  ['(UTC+08:00) Asia/Singapore', 480],
  ['(UTC+08:00) Asia/Hong_Kong', 480],
  ['(UTC+08:00) Asia/Kuala_Lumpur', 480],
  ['(UTC+08:00) Australia/Perth', 480],
  ['(UTC+08:45) Australia/Eucla', 525],
  ['(UTC+09:00) Asia/Tokyo', 540],
  ['(UTC+09:00) Asia/Seoul', 540],
  ['(UTC+09:30) Australia/Adelaide', 570],
  ['(UTC+09:30) Australia/Darwin', 570],
  ['(UTC+10:00) Australia/Sydney', 600],
  ['(UTC+10:00) Australia/Brisbane', 600],
  ['(UTC+10:00) Australia/Melbourne', 600],
  ['(UTC+10:30) Australia/Lord_Howe', 630],
  ['(UTC+11:00) Pacific/Guadalcanal', 660],
  ['(UTC+11:00) Pacific/Noumea', 660],
  ['(UTC+12:00) Pacific/Auckland', 720],
  ['(UTC+12:00) Pacific/Fiji', 720],
  ['(UTC+12:45) Pacific/Chatham', 765],
  ['(UTC+13:00) Pacific/Tongatapu', 780],
  ['(UTC+14:00) Pacific/Kiritimati', 840],
];

export const TIMEZONES: TimezoneOption[] = TZ_RAW.map(([label, offsetMinutes]) => ({
  id: label,
  label,
  offsetMinutes,
}));

// ─── Mentor application (Robby, 2026-10-20) ───────────────────────────────
// GET  /custom/v1/mentors/apply  -> form options, profile prefill, any existing
//                                   application, limits, required list, consent
// POST /custom/v1/mentors/apply  -> multipart; CV in `upload_cv`
// Name, role, company, country, LinkedIn and industry come from the member's
// profile, so they must NOT be sent.
export interface MentorApplicationConfig {
  profile?: Record<string, string>;
  application?: {exists: boolean; [key: string]: any};
  options?: Partial<
    Record<
      | 'timezone'
      | 'experience'
      | 'expertise'
      | 'mentee_profile'
      | 'support'
      | 'duration'
      | 'spoken'
      | 'hours'
      | 'mentees'
      | 'available_sessions',
      string[]
    >
  >;
  limits?: {
    expertise_max?: number;
    mentee_profile_max?: number;
    cv_max_bytes?: number;
    shortbio_max?: number;
    extendedbio_max?: number;
    programme_max?: number;
  };
  consent?: {statements?: string[]};
}

export const getMentorApplicationConfig =
  async (): Promise<MentorApplicationConfig | null> => {
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/custom/v1/mentors/apply`, {
        headers: token ? {Authorization: `Bearer ${token}`} : {},
      });
      if (!res.ok) return null;
      return (await res.json()) as MentorApplicationConfig;
    } catch (err) {
      console.log('getMentorApplicationConfig error:', err);
      return null;
    }
  };

export interface MentorApplicationData {
  timezone: string;
  experience: string;
  expertise: string[]; // 1–5
  menteeProfile: string[]; // 1–3
  shortBio: string; // max 1000
  extendedBio: string; // max 5000
  cvUri: string | null; // required on the first application only
  cvName: string | null;
  cvType: string | null;
  support: string[]; // optional
  duration: string;
  spoken: string[]; // at least 1
  hours: string;
  mentees: string; // "01"–"10"
  availableSessions: string;
  programme: string; // max 3000
}

export interface MentorApplicationResult {
  ok: boolean;
  message?: string;
}

export const submitMentorApplication = async (
  data: MentorApplicationData,
): Promise<MentorApplicationResult> => {
  try {
    const token = await getToken();

    const formData = new FormData();
    formData.append('timezone', data.timezone);
    formData.append('experience', data.experience);
    data.expertise.forEach(v => formData.append('expertise[]', v));
    data.menteeProfile.forEach(v => formData.append('mentee_profile[]', v));
    formData.append('shortbio', data.shortBio);
    formData.append('extendedbio', data.extendedBio);
    data.support.forEach(v => formData.append('support[]', v));
    formData.append('duration', data.duration);
    data.spoken.forEach(v => formData.append('spoken[]', v));
    formData.append('hours', data.hours);
    formData.append('mentees', data.mentees);
    formData.append('available_sessions', data.availableSessions);
    formData.append('programme', data.programme);
    formData.append('consent_confirmed', 'true');

    if (data.cvUri) {
      formData.append('upload_cv', {
        uri: data.cvUri,
        type: data.cvType || 'application/octet-stream',
        name: data.cvName || 'cv.pdf',
      } as any);
    }

    // Do NOT set Content-Type by hand — RN generates the multipart boundary.
    const res = await fetch(`${BASE}/custom/v1/mentors/apply`, {
      method: 'POST',
      headers: token ? {Authorization: `Bearer ${token}`} : {},
      body: formData,
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {}

    if (!res.ok || body?.success === false || body?.code) {
      console.log(`submitMentorApplication failed (${res.status}):`, body);
      return {
        ok: false,
        message:
          body?.error?.reason || body?.message || `Request failed (${res.status})`,
      };
    }
    return {ok: true, message: body?.message};
  } catch (err) {
    console.log('submitMentorApplication error:', err);
    return {ok: false, message: 'Could not reach the server. Check your connection and try again.'};
  }
};
