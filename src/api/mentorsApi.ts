/* eslint-disable prettier/prettier */
import {getToken} from './feedApi';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json';

// ─── Real custom mentor endpoints, given directly by Robby ──────────────────
// 1. List:     GET /custom/v1/mentors/
// 2. Single:   GET /custom/v1/mentors/{mentor_id}          (not used yet —
//              member profile / mentor detail screen is a separate file
//              to be built later; this API only covers the list for now)
// 3. Filters:  GET /custom/v1/mentors/filters               (NOT yet seen —
//              see note on the filter constants below)
// 4/5. Filter + pagination: confirmed via a live example (page=2 +
//      expertise=change-management) that the base list endpoint at #1
//      accepts `page` and taxonomy query params together and returns
//      correct pagination — so this file uses ONE endpoint (#1) for
//      everything: initial list, filtered, and paginated. The separate
//      "/mentors/filter" endpoint Robby mentioned appears to do the same
//      thing; using the base endpoint everywhere keeps this simple and
//      matches what's actually been confirmed working.
// This replaces the previous (incorrect) approach of hitting the raw WP
// /wp/v2/mentor post type directly.

// WordPress still entity-encodes names coming through this API (e.g.
// "Leadership &amp; Team Management") — decode the handful that actually
// show up rather than pulling in a full HTML-entity library.
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

// ─── Filter dropdown options ─────────────────────────────────────────────
// Confirmed live via GET /custom/v1/mentors/filters (2026-07). value: ''
// means "All" (no query param sent); otherwise it's the real slug from
// that endpoint, sent directly as the query param, e.g.
// ?expertise=change-management. Names are entity-decoded ("Aerospace
// &amp; Defence" -> "Aerospace & Defence") since the endpoint returns them
// HTML-encoded like everything else on this API.
export interface FilterOption {
  value: string;
  name: string;
}

export const EXPERIENCE_FILTERS: FilterOption[] = [
  {value: '', name: 'All'},
  {value: '10-15-years', name: '10–15 years'},
  {value: '15-years', name: '15+ years'},
  {value: '3-5-years', name: '3–5 years'},
  {value: '5-10-years', name: '5–10 years'},
];

export const EXPERTISE_FILTERS: FilterOption[] = [
  {value: '', name: 'All'},
  {value: 'agile-scrum', name: 'Agile & Scrum'},
  {value: 'ai-in-project-management', name: 'AI in Project Management'},
  {value: 'budget-cost-management', name: 'Budget & Cost Management'},
  {value: 'career-development-transitions', name: 'Career Development & Transitions'},
  {value: 'change-management', name: 'Change Management'},
  {value: 'data-analytics-reporting', name: 'Data Analytics & Reporting'},
  {value: 'digital-transformation', name: 'Digital Transformation'},
  {value: 'leadership-team-management', name: 'Leadership & Team Management'},
  {value: 'motivation-resilience', name: 'Motivation & Resilience'},
  {value: 'negotiation-communication', name: 'Negotiation & Communication'},
  {value: 'other', name: 'Other'},
  {value: 'pmo-setup-management', name: 'PMO Setup & Management'},
  {value: 'procurement-contract-management', name: 'Procurement & Contract Management'},
  {value: 'programme-management', name: 'Programme Management'},
  {value: 'project-planning-scheduling', name: 'Project Planning & Scheduling'},
  {value: 'risk-management', name: 'Risk Management'},
  {value: 'stakeholder-management', name: 'Stakeholder Management'},
  {value: 'sustainability-esg', name: 'Sustainability & ESG'},
  {value: 'waterfall-traditional-pm', name: 'Waterfall & Traditional PM'},
];

export const INDUSTRY_FILTERS: FilterOption[] = [
  {value: '', name: 'All'},
  {value: 'aerospace-defence', name: 'Aerospace & Defence'},
  {value: 'aerospace-and-defense', name: 'Aerospace and Defense'},
  {value: 'construction-engineering', name: 'Construction & Engineering'},
  {value: 'education-research', name: 'Education & Research'},
  {value: 'energy-infrastructure', name: 'Energy & Infrastructure'},
  {value: 'financial-services', name: 'Financial Services'},
  {value: 'government-public-sector', name: 'Government & Public Sector'},
  {value: 'healthcare-pharmaceuticals', name: 'Healthcare & Pharmaceuticals'},
  {value: 'hospitality-tourism', name: 'Hospitality & Tourism'},
  {value: 'manufacturing-production', name: 'Manufacturing & Production'},
  {value: 'media-entertainment', name: 'Media & Entertainment'},
  {value: 'nonprofit-organisations', name: 'Nonprofit Organisations'},
  {value: 'nonprofit-organizations', name: 'Nonprofit Organizations'},
  {value: 'real-estate-property', name: 'Real Estate & Property'},
  {value: 'retail-consumer-goods', name: 'Retail & Consumer Goods'},
  {value: 'tech-telecom', name: 'Tech & Telecom'},
  {value: 'transportation-logistics', name: 'Transportation & Logistics'},
];

// "Who You Help" is NOT a filterable taxonomy on this endpoint — confirmed
// via GET /custom/v1/mentors/filters, which only returns industry,
// expertise, and experience. That filter tab in the UI currently can't
// actually narrow results; flagged to Robby, worth removing the tab or
// disabling it until/unless the backend adds support for it.
export const WHO_YOU_HELP_FILTERS: FilterOption[] = [{value: '', name: 'All'}];

// ─── Mentor item shape ────────────────────────────────────────────────────
// All fields below are confirmed live from the real endpoint (mentor_id
// 175364 / 175416, fetched via Postman). title and bio_snippet are real —
// the earlier "bio doesn't exist" finding was specific to the raw WP
// /wp/v2/mentor post type; this custom endpoint actually has it.
export interface MentorTerm {
  id: number;
  slug: string;
  name: string;
}

export interface MentorItem {
  id: number;
  userId: number;
  name: string;
  title: string;
  bioSnippet: string;
  tags: string[];
  expertise: MentorTerm[];
  industry: MentorTerm[];
  experience: MentorTerm[];
  avatar: string | null;
  profileUrl: string;
  // Both confirmed as real fields, but empty string for every mentor seen
  // so far (Robby: "there is a backend field where the Calendly link will
  // be added" — not populated yet). Treat empty as "no call link available".
  calendlyLink: string;
  requestCallUrl: string;
}

const mapTerm = (t: any): MentorTerm => ({
  id: t?.id,
  slug: t?.slug || '',
  name: decodeEntities(t?.name || ''),
});

const mapMentor = (m: any): MentorItem => ({
  id: m.mentor_id,
  userId: m.user_id,
  name: decodeEntities(m.name || 'Mentor'),
  title: decodeEntities(m.title || ''),
  bioSnippet: decodeEntities(m.bio_snippet || ''),
  tags: (m.tags || []).map((t: string) => decodeEntities(t)),
  expertise: (m.expertise || []).map(mapTerm),
  industry: (m.industry || []).map(mapTerm),
  experience: (m.experience || []).map(mapTerm),
  avatar: m.profile_image_url || null,
  profileUrl: m.profile_url || '',
  calendlyLink: m.calendly_link || '',
  requestCallUrl: m.request_call_url || '',
});

// ─── Fetch mentors ────────────────────────────────────────────────────────
export const getMentors = async (
  page = 1,
  filters: {
    industry?: string;
    expertise?: string;
    experience?: string;
    // whoYouHelp: confirmed NOT a real filter taxonomy (see WHO_YOU_HELP_FILTERS
    // note above) — this param is sent for forward-compatibility only and
    // will always be undefined in practice since that filter is disabled.
    whoYouHelp?: string;
  } = {},
): Promise<{mentors: MentorItem[]; hasMore: boolean}> => {
  try {
    const token = await getToken();
    const headers: Record<string, string> = token
      ? {Authorization: `Bearer ${token}`}
      : {};

    const params = new URLSearchParams({page: String(page)});
    if (filters.industry) params.set('industry', filters.industry);
    if (filters.expertise) params.set('expertise', filters.expertise);
    if (filters.experience) params.set('experience', filters.experience);
    if (filters.whoYouHelp) params.set('who_you_help', filters.whoYouHelp);

    const res = await fetch(`${BASE}/custom/v1/mentors/?${params.toString()}`, {
      headers,
    });
    if (!res.ok) return {mentors: [], hasMore: false};

    const data = await res.json();
    if (!Array.isArray(data?.mentors)) return {mentors: [], hasMore: false};

    return {
      mentors: data.mentors.map(mapMentor),
      hasMore: !!data.pagination?.has_more,
    };
  } catch (err) {
    console.log('getMentors error:', err);
    return {mentors: [], hasMore: false};
  }
};
