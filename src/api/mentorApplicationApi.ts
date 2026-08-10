/* eslint-disable prettier/prettier */
import {getToken} from './feedApi';
import {getUserIdFromToken} from './profileApi';

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

// ─── Mentor application submission ────────────────────────────────────────
export interface MentorApplicationData {
  firstName: string;
  email: string;
  timezone: string;
  yearsExperience: string;
  shortBio: string;
  extendedBio: string;
  cvUri: string | null;
  cvName: string | null;
  expertise: string[];
  whoYouHelp: string[];
  support: string[];
  sessionDuration: string;
  languages: string[];
  responseTime: string;
  sessionsPerMonth: string;
  availability: string;
  motivation: string;
}

// ⚠️ Backend endpoint needed: POST /ipm/v1/mentor-application
// This endpoint does not exist yet — see the list drafted for Robby.
// Until it's built, submission will fail gracefully (returns false) so the
// UI can show an appropriate message rather than crash.
export const submitMentorApplication = async (
  data: MentorApplicationData,
): Promise<boolean> => {
  try {
    const token = await getToken();
    const userId = await getUserIdFromToken();

    const formData = new FormData();
    formData.append('user_id', String(userId ?? ''));
    formData.append('first_name', data.firstName);
    formData.append('email', data.email);
    formData.append('timezone', data.timezone);
    formData.append('years_experience', data.yearsExperience);
    formData.append('short_bio', data.shortBio);
    formData.append('extended_bio', data.extendedBio);
    formData.append('expertise', JSON.stringify(data.expertise));
    formData.append('who_you_help', JSON.stringify(data.whoYouHelp));
    formData.append('support', JSON.stringify(data.support));
    formData.append('session_duration', data.sessionDuration);
    formData.append('languages', JSON.stringify(data.languages));
    formData.append('response_time', data.responseTime);
    formData.append('sessions_per_month', data.sessionsPerMonth);
    formData.append('availability', data.availability);
    formData.append('motivation', data.motivation);

    if (data.cvUri) {
      formData.append('cv', {
        uri: data.cvUri,
        type: 'application/octet-stream',
        name: data.cvName || 'cv.pdf',
      } as any);
    }

    const res = await fetch(`${BASE}/ipm/v1/mentor-application`, {
      method: 'POST',
      headers: token ? {Authorization: `Bearer ${token}`} : {},
      body: formData,
    });

    return res.ok;
  } catch (err) {
    console.log('submitMentorApplication error:', err);
    return false;
  }
};
