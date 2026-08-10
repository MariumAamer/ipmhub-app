/* eslint-disable prettier/prettier */
// ─── Certifications API — wired to Robby's custom endpoints ─────────────────
// GET /custom/v1/certifications/my?user_id={id}
// GET /custom/v1/certifications/overview
// GET /custom/v1/certifications/ipm
// Confirmed live via Postman (Jul 2026). Response shapes below are copied
// directly from those Postman responses — do not guess/rename fields.

import {getToken} from './apiClient';
import {getUserIdFromToken} from './profileApi';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  return token ? {Authorization: `Bearer ${token}`} : {};
};

// ─── Shared link/button shape used across all 3 endpoints ──────────────────
export interface CertLink {
  title: string;
  url: string;
  target?: string;
}

// ─── /certifications/my ─────────────────────────────────────────────────────
// CONFIRMED via Postman against Aulia's populated account (user_id 7257,
// Aug 2026) — 9 real certificates. Field names below are copied directly
// from that response. Do not rename without a fresh Postman check.
export interface RecommendedBody {
  title: string;
  logo: string;
  items: string[];
  learn_more_url: string;
}

// footer.link is either a real {label, url} object (seen on the one expired
// cert in the sample) or a bare empty string "" (seen on every active cert)
// — never omitted, so always check the type before reading .label/.url.
export interface CertFooterLink {
  label: string;
  url: string;
}

export interface CertFooter {
  // Confirmed values so far: 'default' (blue banner, no link) and 'red'
  // (red banner, real recertify link). No 3rd/navy variant has been seen
  // in real data yet — Marium confirmed the live site expects a navy
  // "Discover How" style for some certs (e.g. IPM Verified Partner), and
  // flagged to Robby that his endpoint currently sends 'red' for that one
  // instead. Render any style other than 'default'/'red' as navy so this
  // resolves itself once Robby's fix ships, without another app update.
  style: 'default' | 'red' | string;
  message: string;
  link: CertFooterLink | '';
}

export interface CertStatus {
  // Confirmed values: 'active' and 'expired'. label is pre-composed by the
  // backend (e.g. "Active", "Expired - Recertify Now") — render it as-is
  // rather than reconstructing wording client-side.
  code: 'active' | 'expired' | string;
  label: string;
  expired_on?: string;
  days_left?: number;
}

export interface MyCertification {
  id: number; // NOTE: always 0 in the confirmed sample — not unique, don't use as a list key
  certificate_id: number; // unique — use this as the list key instead
  title: string;
  name: string; // subtitle, per Marium
  course_label: string;
  course_link: string;
  certificate_url: string;
  preview_url: string;
  issue_on: string;
  expired_on: string;
  group_name: string;
  group_id: number;
  logo_url: string; // confirmed: same flat IPM logo across all certs, not a per-type seal
  status: CertStatus;
  footer: CertFooter;
}

export interface MyCertificationsResponse {
  page_url: string;
  user_id: number;
  has_certificates: boolean;
  count: number;
  certificates: MyCertification[];
  recommended: RecommendedBody[];
  empty_title: string;
  empty_message: string;
}

export const getMyCertifications = async (): Promise<MyCertificationsResponse | null> => {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return null;
    const headers = await authHeaders();
    const res = await fetch(
      `${BASE}/custom/v1/certifications/my?user_id=${userId}`,
      {headers},
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.log('getMyCertifications error:', err);
    return null;
  }
};

// NOTE: RecommendedCourse / RECOMMENDED_COURSES (empty-state recommendation
// cards) moved to coursesApi.ts — it's course data used by the Courses
// screen's My Courses empty state, not certification data. It used to live
// here only because EmptyCoursesRecommendation was originally built for
// the Certifications screen before CoursesScreen started reusing it too.

// ─── /certifications/overview ───────────────────────────────────────────────
export interface OverviewHero {
  title: string;
  description: string;
  photo_url: string;
  button: CertLink;
  logos: {logo_url: string; link: string}[];
}

export interface OverviewHighlight {
  title: string;
  description: string;
  photo_url: string;
  button: CertLink;
}

export interface QualificationItem {
  heading: string;
  name: string;
  description: string;
  photo_url: string;
  logo_url: string;
  learn_more: CertLink;
  courses: CertLink;
  add_bg: 'yes' | 'no';
}

export interface OverviewQualifications {
  title: string;
  description: string;
  items: QualificationItem[];
}

export interface OverviewClients {
  title: string;
  logos: string[];
}

export interface OverviewOutro {
  title: string;
  photo_url: string;
  button: CertLink;
}

export interface CertificationsOverviewResponse {
  page_url: string;
  embed_url: string;
  source_url: string;
  hero: OverviewHero;
  highlight: OverviewHighlight;
  qualifications: OverviewQualifications;
  clients: OverviewClients;
  outro: OverviewOutro;
}

export const getCertificationsOverview =
  async (): Promise<CertificationsOverviewResponse | null> => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/custom/v1/certifications/overview`, {
        headers,
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data ?? null;
    } catch (err) {
      console.log('getCertificationsOverview error:', err);
      return null;
    }
  };

// ─── /certifications/ipm ─────────────────────────────────────────────────────
export interface IpmHero {
  title: string;
  description: string;
  photo_url: string;
  logo_url: string;
  button: CertLink;
}

export interface IpmSection {
  title: string;
  description: string;
  photo_url?: string;
}

export interface IpmDiplomaItem {
  course_id: number;
  title: string;
  description: string;
  label: string;
  photo_url: string;
  button: CertLink;
}

export interface IpmDiplomas {
  title: string;
  description: string; // HTML w/ inline <a>
  items: IpmDiplomaItem[]; // CONFIRMED via Postman (Aug 2026) — per-diploma photo/url, closes the thumbnail gap
}

export interface IpmCertificates {
  title: string;
  description: string;
  photo_url: string;
  items: IpmCertificateItem[];
}

export interface IpmCompletionCertificate {
  title: string;
  description: string;
  second_description: string;
  photo_url: string;
  course_list: CertLink[];
}

export interface CertificationsIpmResponse {
  page_url: string;
  embed_url: string;
  source_url: string;
  hero: IpmHero;
  who_is_ipm: IpmSection;
  philosophy: IpmSection;
  diplomas: IpmDiplomas;
  accreditation: {title: string; description: string}; // HTML w/ <ul><li>
  diploma_details: {description: string; photo_url: string}; // HTML w/ <h3><ul><li>
  certificates: IpmCertificates;
  completion_certificate: IpmCompletionCertificate;
}

export const getCertificationsIpm =
  async (): Promise<CertificationsIpmResponse | null> => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/custom/v1/certifications/ipm`, {
        headers,
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data ?? null;
    } catch (err) {
      console.log('getCertificationsIpm error:', err);
      return null;
    }
  };

// ─── HTML → plain text helper ───────────────────────────────────────────────
// TEMPORARY. Several fields (accreditation.description, diploma_details.description,
// certificates.items[].description) contain real HTML (<ul>, <li>, <h3>, <a>).
// No HTML-rendering library is installed in this project yet
// (react-native-render-html or similar). Until we add one, this strips tags
// down to plain text so nothing crashes/renders literal "<li>" on screen —
// it LOSES the bullet/heading formatting Figma shows. Flagged as a known gap.
//
// NOTE: the course-detail screens (CourseDetailScreen.tsx) now use a more
// capable purpose-built parser instead of this simple stripper —
// utils/parseCourseOverviewHtml.ts preserves heading/paragraph/list
// structure (just not inline bold/links) rather than flattening everything
// to plain text. Worth considering for these certifications fields too,
// since they hit the same underlying problem (WordPress HTML content, no
// renderer library) — but leaving stripHtml as-is here since that's a
// separate decision from the RecommendedCourse addition this edit was
// actually asked to make.
export const stripHtml = (html: string): string =>
  html
    .replace(/<li>/gi, '\n• ')
    .replace(/<\/?(ul|ol)>/gi, '\n')
    .replace(/<h3>/gi, '\n')
    .replace(/<\/h3>/gi, '\n')
    .replace(/<a[^>]*>/gi, '')
    .replace(/<\/a>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
