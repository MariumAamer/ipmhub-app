/* eslint-disable prettier/prettier */
// src/api/coursesApi.ts
//
// Wraps the custom/v1/courses/* and custom/v1/ld-courses/* endpoints
// Robby confirmed (July 2026).
//
// AUTH NOTE (added after a live 401 was hit in testing): the course-list
// endpoints (upcoming/search) are genuinely public and don't need a token.
// But every user-specific endpoint (course details, activity, step
// content, quiz, my-courses, and all the per-tab content endpoints —
// overview/certifications/faqs/about_us/assessment/instructors) requires
// the same Bearer JWT the rest of the app already uses via
// apiClient.ts's getToken(). All fetch calls below now attach it when
// available, same pattern as certificationsApi.ts's authHeaders().

import {getToken} from './apiClient';

const BASE_URL = 'https://hub.instituteprojectmanagement.com/wp-json';

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  return token ? {Authorization: `Bearer ${token}`} : {};
};

async function apiFetch(path: string): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {headers});
  if (!res.ok) throw new Error(`${res.status}: ${path}`);
  return res.json();
}

// ─── Decode HTML entities ───────────────────────────────────────────────────
// Course/certification titles and descriptions come through these WP/
// LearnDash REST endpoints HTML-entity-encoded (e.g. "Project Leadership
// &#038; Management Diploma") since they're raw post titles — same as the
// WP data handled in feedApi.ts/resourcesApi.ts/mentorsApi.ts. Previously
// nothing here decoded them, so an ampersand in a course title rendered as
// literal "&#038;" text on the Store, My Courses, and Search All Courses
// screens. Decode the common numeric + named entities before returning.
const decodeEntities = (text?: string | null): string =>
  (text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .trim();

// ─── Shared shapes ─────────────────────────────────────────────────────────

export interface CourseTab {
  slug: string;
  label: string;
  total: number;
  is_active: boolean;
  per_page: number;
}

export interface Pagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  showing_start: number;
  showing_end: number;
  has_more: boolean;
  show_load_more: boolean;
  load_more_label: string;
  load_more_step: number;
  next_page: number | null;
}

export interface SortOption {
  slug: 'popular' | 'title_asc' | 'title_desc' | 'price_low' | 'price_high';
  label: string;
}

// ─── Upcoming Courses ──────────────────────────────────────────────────────

export interface UpcomingCourse {
  id: string; // hash string, not numeric — do not use as a React key across tabs without namespacing
  course_id: number;
  title: string;
  format: string;
  format_label: string;
  date_label: string;
  start_date: string;
  end_date: string;
  combined_start: string;
  combined_end: string;
  time: string;
  end_time: string;
  duration: string;
  duration_days: string;
  location: string;
  location_url: string;
  price: number | null;
  price_label: string;
  currency_symbol: string;
  currency_code: string;
  permalink: string;
}

export interface UpcomingCoursesResponse {
  tab: string;
  format: string;
  active_tab: string;
  courses: UpcomingCourse[];
  pagination: Pagination;
  pricing: {country_code: string; region: string};
  tabs: CourseTab[];
}

/** GET /custom/v1/courses/upcoming/tabs — tab list + counts, no course data */
export const getUpcomingCoursesTabs = async (): Promise<CourseTab[]> => {
  try {
    const json = await apiFetch('/custom/v1/courses/upcoming/tabs');
    return Array.isArray(json?.tabs) ? json.tabs : [];
  } catch (err) {
    console.error('[coursesApi] getUpcomingCoursesTabs', err);
    return [];
  }
};

/** GET /custom/v1/courses/upcoming?tab=...&page=...&per_page=... */
export const getUpcomingCourses = async (
  tab: string = 'all',
  page: number = 1,
  perPage: number = 10,
): Promise<UpcomingCoursesResponse> => {
  const empty: UpcomingCoursesResponse = {
    tab,
    format: tab,
    active_tab: tab,
    courses: [],
    pagination: {
      total: 0, page, per_page: perPage, total_pages: 0,
      showing_start: 0, showing_end: 0, has_more: false,
      show_load_more: false, load_more_label: 'Show More',
      load_more_step: perPage, next_page: null,
    },
    pricing: {country_code: '', region: ''},
    tabs: [],
  };
  try {
    const json = await apiFetch(
      `/custom/v1/courses/upcoming?tab=${encodeURIComponent(tab)}&page=${page}&per_page=${perPage}`,
    );
    return {
      tab: json?.tab ?? tab,
      format: json?.format ?? tab,
      active_tab: json?.active_tab ?? tab,
      courses: Array.isArray(json?.courses)
        ? json.courses.map((c: UpcomingCourse) => ({...c, title: decodeEntities(c.title)}))
        : [],
      pagination: json?.pagination ?? empty.pagination,
      pricing: json?.pricing ?? empty.pricing,
      tabs: Array.isArray(json?.tabs) ? json.tabs : [],
    };
  } catch (err) {
    console.error('[coursesApi] getUpcomingCourses', err);
    return empty;
  }
};

// ─── Search All Courses ────────────────────────────────────────────────────

export interface CourseFormat {
  id: number;
  slug: string;
  name: string;
}

export interface CertificationLogo {
  logo_url: string;
  logo_small_url: string;
  is_circle: boolean;
  link_url: string;
}

export interface SearchCourse {
  id: number;
  title: string;
  slug: string;
  permalink: string;
  image_url: string;
  phone_image_url: string;
  is_short_course: boolean;
  description: string;
  for_whom: string;
  certificate: string;
  course_length: string;
  delivery_types: string[];
  delivery_types_label: string;
  formats: CourseFormat[];
  programme_types: CourseFormat[];
  certifications: CourseFormat[];
  certification_logos: CertificationLogo[];
  promo_label: string;
  has_ai_label: boolean;
  ai_label: string;
  brochure_url: string;
  is_on_demand: boolean;
  // NOTE: `price` is sometimes null even when the course has a real price
  // (confirmed in Postman — e.g. "Project Finance Mastery"). Always render
  // price_label / price_range for display, never `price` directly.
  price: number | null;
  price_label: string;
  price_range: string;
  currency_symbol: string;
  currency_code: string;
}

export interface FilterOption {
  id: number;
  slug: string;
  name: string;
  count: number;
  is_active: boolean;
  is_disabled: boolean;
}

export interface FilterGroup {
  taxonomy: 'certifications' | 'typeof' | 'format' | 'duration' | 'keywords';
  param: string;
  sf_param: string;
  label: string;
  input_type: string;
  collapsed: boolean;
  options: FilterOption[];
}

export interface SearchCoursesResponse {
  results_label: string;
  results_count: number;
  query: string;
  sort: string;
  sort_options: SortOption[];
  active_filters: Record<string, string[]>;
  has_active_filters: boolean;
  courses: SearchCourse[];
  pagination: Pagination;
  pricing: {country_code: string};
  filters: FilterGroup[];
  clear_filters: boolean;
  form_slug: string;
}

export interface SearchCoursesParams {
  page?: number;
  per_page?: number;
  query?: string;
  sort?: SortOption['slug'];
  certifications?: string; // filter slug, e.g. 'ipm'
  typeof?: string;         // filter slug, e.g. 'core-certification'
  format?: string;         // filter slug, e.g. 'live-online'
  duration?: string;
  keywords?: string;
}

const emptySearchResponse = (page: number, perPage: number): SearchCoursesResponse => ({
  results_label: '',
  results_count: 0,
  query: '',
  sort: 'popular',
  sort_options: [],
  active_filters: {},
  has_active_filters: false,
  courses: [],
  pagination: {
    total: 0, page, per_page: perPage, total_pages: 0,
    showing_start: 0, showing_end: 0, has_more: false,
    show_load_more: false, load_more_label: 'Show More',
    load_more_step: perPage, next_page: null,
  },
  pricing: {country_code: ''},
  filters: [],
  clear_filters: true,
  form_slug: 'courses-listing-search',
});

/** GET /custom/v1/courses/search — supports stacking filters (AND across groups) + pagination */
export const searchCourses = async (
  params: SearchCoursesParams = {},
): Promise<SearchCoursesResponse> => {
  const {page = 1, per_page = 10, ...filters} = params;
  const qs = new URLSearchParams({page: String(page), per_page: String(per_page)});
  Object.entries(filters).forEach(([key, value]) => {
    if (value) qs.append(key, String(value));
  });
  try {
    const json = await apiFetch(`/custom/v1/courses/search?${qs.toString()}`);
    const merged = {...emptySearchResponse(page, per_page), ...json};
    return {
      ...merged,
      courses: Array.isArray(merged.courses)
        ? merged.courses.map((c: SearchCourse) => ({
            ...c,
            title: decodeEntities(c.title),
            description: decodeEntities(c.description),
          }))
        : [],
    };
  } catch (err) {
    console.error('[coursesApi] searchCourses', err);
    return emptySearchResponse(page, per_page);
  }
};

/**
 * GET /custom/v1/courses/search/filters — filter option counts, aware of
 * whatever filters are already active (pass the same params you'd pass to
 * searchCourses so counts reflect the current selection).
 */
export const getSearchFilters = async (
  params: Omit<SearchCoursesParams, 'page' | 'per_page'> = {},
): Promise<{filters: FilterGroup[]; sort_options: SortOption[]; active_filters: Record<string, string[]>}> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) qs.append(key, String(value));
  });
  const empty = {filters: [], sort_options: [], active_filters: {}};
  try {
    const json = await apiFetch(`/custom/v1/courses/search/filters?${qs.toString()}`);
    return {
      filters: Array.isArray(json?.filters) ? json.filters : [],
      sort_options: Array.isArray(json?.sort_options) ? json.sort_options : [],
      active_filters: json?.active_filters ?? {},
    };
  } catch (err) {
    console.error('[coursesApi] getSearchFilters', err);
    return empty;
  }
};

// ─── My Courses (enrolled / in-progress) ───────────────────────────────────
// Confirmed response shape (July 2026 Postman paste), section: "ld-inprogress".
// TODO: endpoint URL not yet confirmed — Marium pasted the JSON body but not
// the request URL. Placeholder path below — swap MY_COURSES_PATH once known.
// Likely pattern based on the quiz endpoint we already confirmed
// (custom/v1/ld-courses/{course_id}/steps/{step_id}/quiz) would be something
// like custom/v1/ld-courses/{user_id}/in-progress — NOT confirmed, do not
// ship against this guess without verifying in Postman first.

export interface CourseCategory {
  id: number;
  name: string;
  slug: string;
}

export interface CourseStatus {
  slug: 'in_progress' | 'not_started' | 'completed' | string;
  label: string;
}

export interface CourseProgress {
  percentage: number;
  completed_steps: number;
  total_steps: number;
  display: string; // e.g. "22% Complete | 10/44 Steps"
}

export interface CourseActivityStamp {
  timestamp: number;
  iso8601: string;
  display: string;
}

export interface CourseCurriculumTotals {
  modules: number;
  topics: number;
  quizzes: number;
  labels: {modules: string; topics: string; quizzes: string};
}

export interface EnrolledCourse {
  id: number;
  title: string;
  slug: string;
  permalink: string;
  image: string;
  categories: CourseCategory[];
  status: CourseStatus;
  progress: CourseProgress;
  activity: {
    started_at: CourseActivityStamp | null;
    completed_at: CourseActivityStamp | null;
    updated_at: CourseActivityStamp | null;
    last_activity: CourseActivityStamp | null;
  };
  access: {from: string | null; expires: string | null};
  current_step: {
    lesson_id: number;
    lesson_title: string;
    step_id: number;
    step_title: string;
    step_type: string;
    permalink: string;
  };
  curriculum: {
    content_label: string;
    progression_enabled: boolean;
    totals: CourseCurriculumTotals;
  };
  section: string;
  card_status: string; // e.g. "In-Progress"
  format_label: string; // e.g. "On-Demand (Anytime)"
  is_academy: boolean;
  logo: string;
  enrollment: {
    has_group_access: boolean;
    is_unlimited: boolean;
    from: string | null;
    expires: string | null;
    date_display: string;
  };
}

export interface MyCoursesResponse {
  user_id: number;
  section: string;
  count: number;
  courses: EnrolledCourse[];
}

/** GET custom/v1/my-courses/in-progress?user_id={userId} — confirmed endpoint (July 2026) */
export const getMyCourses = async (userId: number): Promise<MyCoursesResponse> => {
  const empty: MyCoursesResponse = {user_id: userId, section: 'ld-inprogress', count: 0, courses: []};
  if (!userId) return empty;
  try {
    const json = await apiFetch(`/custom/v1/my-courses/in-progress?user_id=${userId}`);
    return {
      user_id: json?.user_id ?? userId,
      section: json?.section ?? 'ld-inprogress',
      count: json?.count ?? 0,
      courses: Array.isArray(json?.courses)
        ? json.courses.map((c: EnrolledCourse) => ({...c, title: decodeEntities(c.title)}))
        : [],
    };
  } catch (err) {
    console.error('[coursesApi] getMyCourses', err);
    return empty;
  }
};

/** GET custom/v1/my-courses/completed?user_id={userId} — envelope shape CONFIRMED
 * (user_id, section: "wk_completed", count, courses). Note the section slug differs
 * from in-progress ("wk_completed" vs "ld-inprogress"). The individual course-object
 * fields are still UNCONFIRMED — the sample response had count: 0 / courses: [], so
 * we have no real completed course to check field names against yet (e.g. may include
 * a completion date or certificate link that in-progress doesn't). Reusing the
 * EnrolledCourse shape as a best guess until a real completed course is seen.
 */
export const getCompletedCourses = async (userId: number): Promise<MyCoursesResponse> => {
  const empty: MyCoursesResponse = {user_id: userId, section: 'wk_completed', count: 0, courses: []};
  if (!userId) return empty;
  try {
    const json = await apiFetch(`/custom/v1/my-courses/completed?user_id=${userId}`);
    return {
      user_id: json?.user_id ?? userId,
      section: json?.section ?? 'wk_completed',
      count: json?.count ?? 0,
      courses: Array.isArray(json?.courses)
        ? json.courses.map((c: EnrolledCourse) => ({...c, title: decodeEntities(c.title)}))
        : [],
    };
  } catch (err) {
    console.error('[coursesApi] getCompletedCourses', err);
    return empty;
  }
};

// ─── Single course — Details (header + tabs + sidebar) — CONFIRMED shape ──

export interface CourseDetailTab {
  id: 'overview' | 'modules' | 'certifications' | 'faqs' | 'about_us' | 'forums' | string;
  label: string;
  visible: boolean;
  type: 'content' | 'activity' | 'link';
  endpoint: string | null;
  url?: string; // present when type === 'link'
  note?: string;
}

export interface CourseDetailHeader {
  cover_image: string;
  featured_image: string;
  categories: CourseCategory[];
  tags: any[];
  certification_logos: {url: string; alt: string}[];
  about_snippet: string;
  about_snippet_html: string;
  meta: {
    certificate_name: string;
    learning_hours: string; // e.g. "14 hours of Learning"
    course_level: string;
    course_language: string;
    access_days: number;
    access_period: string; // e.g. "12 Weeks"
    price: string; // pre-formatted, e.g. "€295"
    price_type: string;
  };
  is_exam_simulator: boolean;
}

export interface CourseDetailSidebar {
  enrollment: {
    is_enrolled: boolean;
    status: CourseStatus;
    progress: CourseProgress;
    button: {label: string; action: string; url: string; auto_login?: boolean}; // label is "Continue" or "Take this course". auto_login (Aug 2026, confirmed by Robby): when the request includes the user's real Bearer token, url now embeds a one-time ?ipm_jwt= login token so opening it in-browser skips the sign-in screen — see getCourseDetails() notes above.
    current_step: EnrolledCourse['current_step'];
    certificate_url: string;
  };
  course_includes: {
    title: string;
    totals: CourseCurriculumTotals;
    display: {modules: string; topics: string; quizzes: string}; // pre-formatted e.g. "4 Modules"
  };
  author_info: {
    image: string;
    content: string;
    content_html: string;
  };
  preview_video: string;
  enrolled_count: number;
}

export interface CourseDetailsResponse {
  user_id: number;
  course: {
    id: number;
    title: string;
    slug: string;
    permalink: string;
    header: CourseDetailHeader;
    tabs: CourseDetailTab[];
    sidebar: CourseDetailSidebar;
  };
}

/** GET custom/v1/ld-courses/{courseId}/details?user_id={userId} — CONFIRMED
 *
 * The endpoint has TWO confirmed modes (Aug 2026 Postman tests):
 *   - WITH ?user_id=X: enrollment-specific. Returns personalized progress
 *     when X is enrolled — but 403s if X is a real account that just
 *     ISN'T enrolled in this particular course.
 *   - WITHOUT ?user_id (still WITH the Authorization: Bearer token —
 *     apiFetch's authHeaders() attaches it to every call automatically,
 *     including this retry): returns is_enrolled: false and a working
 *     sidebar.enrollment.button. CONFIRMED (Aug 2026, per Robby): when a
 *     real Bearer token is present on this exact request shape, button.url
 *     now embeds a one-time ?ipm_jwt= auto-login token, so opening it
 *     in-browser lands the person already signed in instead of showing a
 *     login form. (A fully anonymous request with no token at all — e.g.
 *     a bare Postman call with no Authorization header — gets the plain
 *     permalink instead, no auto_login.)
 * So: try with userId first (needed for real progress on enrolled
 * courses). If that specifically 403s, it means "valid account, just not
 * enrolled in THIS course" — retry once without user_id (token still
 * attached) to get the preview data WITH the auto-login button instead of
 * failing outright. Self-healing at this layer means callers
 * (CourseDetailScreen) don't need to know in advance whether the course
 * they're opening is one the user has enrolled in. */
export const getCourseDetails = async (
  courseId: number,
  userId?: number,
): Promise<CourseDetailsResponse | null> => {
  const withUserPath = `/custom/v1/ld-courses/${courseId}/details${userId ? `?user_id=${userId}` : ''}`;
  try {
    const json = await apiFetch(withUserPath);
    return json ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (userId && msg.startsWith('403')) {
      try {
        const json = await apiFetch(`/custom/v1/ld-courses/${courseId}/details`);
        return json ?? null;
      } catch (err2) {
        console.error('[coursesApi] getCourseDetails (preview retry)', err2);
        return null;
      }
    }
    console.error('[coursesApi] getCourseDetails', err);
    return null;
  }
};

// ─── Single course — Activity (full curriculum + progress) — CONFIRMED ────

export interface CourseStepBase {
  id: number;
  title: string;
  slug: string;
  type: 'lesson' | 'topic' | 'quiz';
  post_type: string;
  permalink: string;
  status: 'completed' | 'in_progress' | 'not_started' | string;
  activity: {
    started_at: CourseActivityStamp | null;
    completed_at: CourseActivityStamp | null;
    updated_at: CourseActivityStamp | null;
  };
  // CONFIRMED via a live crash (July 2026): duration is NOT a plain
  // string as originally guessed — it's an object {minutes: number,
  // display: string}. Rendering it directly as {step.duration} crashed
  // with "Objects are not valid as a React child". Keeping string|null in
  // the union since that was the original (unconfirmed) guess and may
  // still occur for some step types — always render via a helper that
  // extracts .display when it's an object, never the raw field directly.
  duration: {minutes: number; display: string} | string | null;
  access: {is_locked: boolean; available_at: string | null};
  is_current: boolean;
}

export interface CourseTopic extends CourseStepBase {}

export interface CourseQuizStep extends CourseStepBase {}

export interface CourseLesson extends CourseStepBase {
  counts: {topics: number; quizzes: number; display: string};
  progress: {percentage: number; completed: number; total: number; display: string} | null;
  topics: CourseTopic[];
  quizzes: CourseQuizStep[];
}

export interface CourseActivityResponse {
  user_id: number;
  course: {
    id: number;
    title: string;
    slug: string;
    permalink: string;
    image: string;
    categories: CourseCategory[];
    status: CourseStatus;
    progress: CourseProgress;
    activity: EnrolledCourse['activity'];
    access: {from: string | null; expires: string | null};
    current_step: EnrolledCourse['current_step'];
    curriculum: {
      content_label: string;
      progression_enabled: boolean;
      totals: CourseCurriculumTotals;
    };
    lessons: CourseLesson[];
  };
}

// CONFIRMED live crash (Aug 2026): some courses include "activity"-type
// lessons (a leaf module with direct content, no lesson->topic/quiz
// substructure at all — e.g. a standalone LearnDash assignment surfaced
// as a top-level lesson) whose backend response omits `topics`/`quizzes`
// entirely (or sends null) instead of an empty array, since there's
// nothing to nest. Every consumer of getCourseActivity — ModuleRow's
// `hasChildren = lesson.topics.length > 0 || ...` in
// CourseDetailScreen.tsx, and the lesson lookups in StepContentScreen.tsx
// and QuizScreen.tsx (`[...lesson.topics, ...lesson.quizzes]`,
// `l.quizzes.some(...)`) — assumed these were always real arrays and
// crashed the instant one of these lessons was rendered or searched
// through. Normalizing here, once, at the source, means every screen
// downstream can keep assuming real arrays safely.
const normalizeLesson = (lesson: CourseLesson): CourseLesson => ({
  ...lesson,
  topics: Array.isArray(lesson.topics) ? lesson.topics : [],
  quizzes: Array.isArray(lesson.quizzes) ? lesson.quizzes : [],
});

/** GET custom/v1/ld-courses/{courseId}/activity?user_id={userId} — CONFIRMED */
export const getCourseActivity = async (courseId: number, userId: number): Promise<CourseActivityResponse | null> => {
  try {
    const json = await apiFetch(`/custom/v1/ld-courses/${courseId}/activity?user_id=${userId}`);
    if (!json) return null;
    return {
      ...json,
      course: {
        ...json.course,
        lessons: Array.isArray(json.course?.lessons) ? json.course.lessons.map(normalizeLesson) : [],
      },
    };
  } catch (err) {
    // A 404 here is EXPECTED when opening a course the user isn't
    // enrolled in yet (e.g. tapping a recommendation card) — there's
    // simply no activity record to return, not a real failure. Only log
    // (and let LogBox surface) anything that isn't that expected case.
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.startsWith('404')) {
      console.error('[coursesApi] getCourseActivity', err);
    }
    return null;
  }
};

// ─── Content sub-tabs (Overview/Certifications/FAQs/About Us) ─────────────
// URLs come dynamically from CourseDetailsResponse.course.tabs[].endpoint —
// NOT hardcoded here since they're per-course.

// Overview tab — CONFIRMED (July 2026 Postman paste). Content is raw
// WordPress HTML (course_overview / html — same value, duplicated), not a
// structured field-per-section shape. Certifications/FAQs/About Us are
// still unconfirmed — likely the same {tab, content} envelope, but the
// inner `content` fields will differ per tab and should not be assumed
// identical to this one until confirmed.
export interface OverviewTabResponse {
  user_id: number;
  course_id: number;
  tab: CourseDetailTab;
  content: {
    course_overview_first: string;
    course_overview: string; // raw HTML
    course_description: string;
    author: {
      image: string;
      description: string;
      description_html: string;
    };
    html: string; // duplicate of course_overview in the confirmed sample
  };
}

export const getOverviewTabContent = async (endpointUrl: string, userId: number): Promise<OverviewTabResponse | null> => {
  try {
    // The raw tab.endpoint from getCourseDetails() does NOT include
    // user_id — confirmed 401 without it, confirmed working with it
    // appended (this is how Marium's successful Postman tests were run).
    const separator = endpointUrl.includes('?') ? '&' : '?';
    const url = `${endpointUrl}${separator}user_id=${userId}`;
    const headers = await authHeaders();
    const res = await fetch(url, {headers});
    if (!res.ok) throw new Error(`${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    console.error('[coursesApi] getOverviewTabContent', err);
    return null;
  }
};

// Certifications tab — CONFIRMED (July 2026 Postman paste). Note the field
// names differ from Overview's envelope: content.items[], each with an
// image (not present on Overview's shape at all).
export interface CertificationItem {
  image: string;
  title: string;
  description: string;
  description_html: string;
}

export interface CertificationsTabResponse {
  user_id: number;
  course_id: number;
  tab: CourseDetailTab;
  content: {
    items: CertificationItem[];
  };
}

export const getCertificationsTabContent = async (endpointUrl: string, userId: number): Promise<CertificationsTabResponse | null> => {
  try {
    // The raw tab.endpoint from getCourseDetails() does NOT include
    // user_id — confirmed 401 without it, confirmed working with it
    // appended (this is how Marium's successful Postman tests were run).
    const separator = endpointUrl.includes('?') ? '&' : '?';
    const url = `${endpointUrl}${separator}user_id=${userId}`;
    const headers = await authHeaders();
    const res = await fetch(url, {headers});
    if (!res.ok) throw new Error(`${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    console.error('[coursesApi] getCertificationsTabContent', err);
    return null;
  }
};

// FAQs tab — CONFIRMED (July 2026 Postman paste). content.html is a raw
// WordPress "wpsm_accordion" shortcode blob (with embedded <style>/
// <script> tags) — NOT a structured {faqs:[]} array. Parse with
// parseFaqsHtml() from utils/parseCourseOverviewHtml before rendering.
export interface FaqsTabResponse {
  user_id: number;
  course_id: number;
  tab: CourseDetailTab;
  content: {
    shortcode_id: number;
    html: string;
  };
}

export const getFaqsTabContent = async (endpointUrl: string, userId: number): Promise<FaqsTabResponse | null> => {
  try {
    // The raw tab.endpoint from getCourseDetails() does NOT include
    // user_id — confirmed 401 without it, confirmed working with it
    // appended (this is how Marium's successful Postman tests were run).
    const separator = endpointUrl.includes('?') ? '&' : '?';
    const url = `${endpointUrl}${separator}user_id=${userId}`;
    const headers = await authHeaders();
    const res = await fetch(url, {headers});
    if (!res.ok) throw new Error(`${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    console.error('[coursesApi] getFaqsTabContent', err);
    return null;
  }
};

// About Us tab — CONFIRMED (July 2026 Postman paste). Same
// raw-WordPress-HTML pattern as Overview (content.description /
// description_html — same value duplicated), but this one can also embed
// a wp-block-video figure (YouTube iframe) — parseCourseOverviewHtml
// handles that as a 'video' block type.
export interface AboutUsTabResponse {
  user_id: number;
  course_id: number;
  tab: CourseDetailTab;
  content: {
    description: string; // raw HTML
    description_html: string; // duplicate of description in the confirmed sample
  };
}

export const getAboutUsTabContent = async (endpointUrl: string, userId: number): Promise<AboutUsTabResponse | null> => {
  try {
    // The raw tab.endpoint from getCourseDetails() does NOT include
    // user_id — confirmed 401 without it, confirmed working with it
    // appended (this is how Marium's successful Postman tests were run).
    const separator = endpointUrl.includes('?') ? '&' : '?';
    const url = `${endpointUrl}${separator}user_id=${userId}`;
    const headers = await authHeaders();
    const res = await fetch(url, {headers});
    if (!res.ok) throw new Error(`${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    console.error('[coursesApi] getAboutUsTabContent', err);
    return null;
  }
};

// Assessment tab — CONFIRMED (July 2026 Postman paste, course_id 22814
// "Certified Project Management Diploma"). Structured array like
// Certifications (content.items[]), but each item's description is raw
// WordPress HTML (p/ol/li/strong/br) — parse with parseCourseOverviewHtml
// before rendering, same as Overview/About Us.
export interface AssessmentItem {
  title: string;
  description: string; // raw HTML
  description_html: string; // duplicate of description in the confirmed sample
}

export interface AssessmentTabResponse {
  user_id: number;
  course_id: number;
  tab: CourseDetailTab;
  content: {
    items: AssessmentItem[];
  };
}

export const getAssessmentTabContent = async (endpointUrl: string, userId: number): Promise<AssessmentTabResponse | null> => {
  try {
    // The raw tab.endpoint from getCourseDetails() does NOT include
    // user_id — confirmed 401 without it, confirmed working with it
    // appended (this is how Marium's successful Postman tests were run).
    const separator = endpointUrl.includes('?') ? '&' : '?';
    const url = `${endpointUrl}${separator}user_id=${userId}`;
    const headers = await authHeaders();
    const res = await fetch(url, {headers});
    if (!res.ok) throw new Error(`${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    console.error('[coursesApi] getAssessmentTabContent', err);
    return null;
  }
};

// Instructors tab — CONFIRMED (July 2026 Postman paste, course_id 22814).
// Note `video`/`video_url` and `profile_read_more` were empty strings for
// every instructor in the sample — real format/behavior unconfirmed if
// ever populated. `profile` is raw WordPress HTML (sometimes starting
// with an <h3> role title like "Course Director", sometimes not) — parse
// with parseCourseOverviewHtml before rendering, same as every other
// HTML-content tab.
export interface InstructorItem {
  name: string;
  designation: string; // e.g. "PhD, MSc, BA, RPP, FAPM, SFHEA"
  image: string;
  video: string;
  video_url: string;
  profile: string; // raw HTML
  profile_html: string; // duplicate of profile in the confirmed sample
  profile_read_more: string; // empty in every sample seen — purpose unconfirmed
  features: any[]; // empty in every sample seen — shape unconfirmed
}

export interface InstructorsTabResponse {
  user_id: number;
  course_id: number;
  tab: CourseDetailTab;
  content: {
    title: string; // e.g. "Course Instructors"
    items: InstructorItem[];
  };
}

export const getInstructorsTabContent = async (endpointUrl: string, userId: number): Promise<InstructorsTabResponse | null> => {
  try {
    // The raw tab.endpoint from getCourseDetails() does NOT include
    // user_id — confirmed 401 without it, confirmed working with it
    // appended (this is how Marium's successful Postman tests were run).
    const separator = endpointUrl.includes('?') ? '&' : '?';
    const url = `${endpointUrl}${separator}user_id=${userId}`;
    const headers = await authHeaders();
    const res = await fetch(url, {headers});
    if (!res.ok) throw new Error(`${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    console.error('[coursesApi] getInstructorsTabContent', err);
    return null;
  }
};

// All 7 known dynamic content tabs are now confirmed and typed above
// (overview, certifications, faqs, about_us, assessment, instructors —
// modules uses getCourseActivity separately). This generic fetcher is
// kept only as a safety net for any future tab id a course might expose
// that isn't one of the known set — response shape genuinely unconfirmed
// for anything landing here.
export const getCourseDetailTabContent = async (endpointUrl: string, userId: number): Promise<any> => {
  try {
    // The raw tab.endpoint from getCourseDetails() does NOT include
    // user_id — confirmed 401 without it, confirmed working with it
    // appended (this is how Marium's successful Postman tests were run).
    const separator = endpointUrl.includes('?') ? '&' : '?';
    const url = `${endpointUrl}${separator}user_id=${userId}`;
    const headers = await authHeaders();
    const res = await fetch(url, {headers});
    if (!res.ok) throw new Error(`${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    console.error('[coursesApi] getCourseDetailTabContent', err);
    return null;
  }
};

/** GET custom/v1/ld-courses/{courseId}/steps/{stepId}/content?user_id={userId}
 *  Lesson/topic content — CONFIRMED (July 2026 Postman paste). All
 *  content fields (html/excerpt/video_url/short_description/materials)
 *  were empty strings in the sample response (that particular lesson has
 *  no populated content yet), but the SHAPE itself is locked in. Note
 *  `materials` is a plain string, not a structured array — likely raw
 *  HTML or a shortcode when populated, not {label,url}[] as originally
 *  guessed.
 */
export interface StepContentResponse {
  user_id: number;
  step: {
    id: number;
    course_id: number;
    title: string;
    slug: string;
    type: 'lesson' | 'topic' | 'quiz' | string;
    post_type: string;
    permalink: string;
    status: string;
    duration: {minutes: number; display: string} | string | null; // see CourseStepBase note — confirmed object shape via live crash
    access: {is_locked: boolean; available_at: string | null};
    content: {
      html: string; // raw HTML, likely same WordPress pattern as course_overview/about_us
      excerpt: string;
      video_url: string; // format unconfirmed — no populated sample seen yet
      short_description: string;
      materials: string; // plain string, NOT an array — format unconfirmed
    };
    assignments: {
      has_assignments: boolean;
      points_enabled: boolean;
      points: number;
    };
    is_sample: boolean;
  };
}

export const getStepContent = async (courseId: number, stepId: number, userId: number): Promise<StepContentResponse | null> => {
  try {
    return await apiFetch(`/custom/v1/ld-courses/${courseId}/steps/${stepId}/content?user_id=${userId}`);
  } catch (err) {
    console.error('[coursesApi] getStepContent', err);
    return null;
  }
};

// ─── Mark step complete ─────────────────────────────────────────────────
// CONFIRMED (July 2026 Postman paste). Marks a lesson/topic complete and
// returns the updated step + course progress in one call, so the caller
// does NOT need to re-fetch getCourseActivity separately afterward.
export interface MarkStepCompleteResponse {
  success: boolean;
  user_id: number;
  course_id: number;
  step_id: number;
  marked: boolean;
  already_completed: boolean;
  step_status: 'completed' | string;
  step: {id: number; status: string; type: string; [key: string]: any};
  progress: {
    percentage: number;
    completed_steps: number;
    total_steps: number;
    display: string; // e.g. "95% Complete | 64/67 Steps"
  };
  course_status: {slug: string; label: string};
  // CONFIRMED shape (seen identically in both markStepComplete and
  // submitQuiz responses, Aug 2026) — points to the next step to work on.
  current_step: {
    lesson_id: number;
    lesson_title: string;
    step_id: number;
    step_title: string;
    step_type: string;
    permalink: string;
  };
}

/** POST custom/v1/ld-courses/{courseId}/steps/{stepId}/complete?user_id={userId} — CONFIRMED */
export const markStepComplete = async (
  courseId: number,
  stepId: number,
  userId: number,
): Promise<MarkStepCompleteResponse | null> => {
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE_URL}/custom/v1/ld-courses/${courseId}/steps/${stepId}/complete?user_id=${userId}`,
    {method: 'POST', headers},
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // CONFIRMED real case (Aug 2026): a 409 here is the backend
    // deliberately enforcing sequential step completion — e.g. "This step
    // cannot be completed yet. Finish earlier required steps first."
    // That's genuinely useful to the person, not just a generic failure,
    // so this now THROWS the real message instead of swallowing it and
    // returning null — the caller (StepContentScreen) shows err.message
    // directly in its alert instead of a vague "try again" that hides
    // what's actually going on. Deliberately deviates from this file's
    // usual swallow-and-log-null convention for that reason.
    const message = (data && (data.message || data.code)) || `${res.status}: markStepComplete`;
    console.error('[coursesApi] markStepComplete', message);
    throw new Error(message);
  }
  return data;
};

// ─── Quiz ────────────────────────────────────────────────────────────────
// RE-CONFIRMED (July 2026, real 20-question paste for course 22814 / quiz
// 24450, user 52). This replaces an earlier, WRONG assumed shape that used
// `_answer`/`_correct`/`_points` per-answer field names — none of those
// exist. Corrected below. Also: no `cloze_answer` question_type appears
// anywhere in this real payload (all 20 are `single`) — the earlier note
// claiming cloze_answer was "confirmed to exist" does not hold up against
// this data; treat single as the only confirmed type until a real
// cloze_answer sample is seen.
export interface QuizAnswer {
  index: number;
  answer: string; // was wrongly assumed to be `_answer`
  html: boolean;
  sort_string: string;
  graded: boolean;
  graded_type: string;
  grading_progression: string;
  // NOTE: there is NO correctness field here (no `_correct` or similar).
  // Do not render per-answer right/wrong state from this endpoint — it
  // isn't in the data. Correctness/grading, if ever exposed, will need a
  // separate confirmed endpoint.
  [key: string]: any;
}

export interface QuizQuestion {
  id: number;
  post_id: number;
  title: string;
  question: string; // plain text for most questions, but at least one
  // sample (Q6) wraps it in <p> tags — always run through a stripper
  // before rendering.
  question_type: string; // only 'single' confirmed so far — see note above
  points: number;
  answers: QuizAnswer[];
}

export interface QuizResponse {
  user_id: number;
  quiz: {
    id: number;
    course_id: number;
    title: string;
    slug: string;
    type: string;
    post_type: string;
    permalink: string;
    status: string; // e.g. "completed" — this is the user's completion
    // status for the quiz itself, not a per-question field
    passing_percentage: number;
    repeats: string | number;
    can_retake: boolean;
    quiz_meta: Record<string, any>; // large LearnDash config blob, not
    // meant to be rendered directly — settings like
    // sfwd-quiz_showMaxQuestionValue, sfwd-quiz_timeLimit live here
    content: {html: string; excerpt: string; short_description: string; materials: string};
    questions: QuizQuestion[];
    question_count: number;
  };
}

/** GET custom/v1/ld-courses/{courseId}/steps/{stepId}/quiz?user_id={userId} */
export const getQuiz = async (courseId: number, stepId: number, userId: number): Promise<QuizResponse | null> => {
  try {
    const json = await apiFetch(`/custom/v1/ld-courses/${courseId}/steps/${stepId}/quiz?user_id=${userId}`);
    return json ?? null;
  } catch (err) {
    console.error('[coursesApi] getQuiz', err);
    return null;
  }
};

// ─── Quiz submit / grade / results ──────────────────────────────────────
// CONFIRMED (Aug 2026) via a real end-to-end Postman round-trip: this
// exact request shape (question_id + selected_indexes per answer, plus
// top-level user_id/timespent) was submitted and returned a real 200 with
// a fully graded response — see GradedQuestionResult/QuizSubmitResponse
// below for the confirmed response shape. Tested with both single-select
// and multiple-select (multi-answer) questions in the same request.

export interface QuizAnswerSubmission {
  question_id: number;
  selected_indexes?: number[]; // for single/multi-select question types — CONFIRMED working for both
  text?: string; // for free-text/essay-style question types — NOT tested, no essay question seen in a real quiz yet
}

export interface QuizSubmitRequest {
  user_id: number;
  timespent: number; // seconds
  answers: QuizAnswerSubmission[];
}

export interface GradedAnswerOption {
  index: number;
  answer: string;
  html: string; // CONFIRMED — same text as `answer` but with LearnDash's own trailing-space quirks preserved; `answer` is the clean version, prefer it for display
  selected: boolean;
  is_correct: boolean;
}

// A WordPress-style {raw, rendered} pair — CONFIRMED (Aug 2026) real
// submit response shape for explanation/tip. This is the SAME pattern
// that crashed StepContentScreen's course.title render earlier this
// session ("Objects are not valid as a React child"). always render
// `.rendered` (or `.raw`), NEVER the object itself.
export interface RichTextField {
  raw: string;
  rendered: string;
}

// CONFIRMED (Aug 2026) via real Postman submit response — replaces every
// earlier guess. Was: is_correct/selected_indexes/correct_indexes (July
// 2026, never verified, wrong); then correct/user_answer/correct_answer
// with unverified `any` shapes (per Robby's prose description). Now
// locked to the real response.
export interface GradedQuestionResult {
  question_id: number;
  post_id: number;
  title: string; // short label, e.g. "Q1"
  question: string; // full question text, may contain HTML — CONFIRMED
  question_type: 'single' | 'multiple' | string; // CONFIRMED values seen: single, multiple. Open to other LearnDash types (e.g. cloze_answer, essay) not yet seen in a real response — treat unknown values gracefully, don't assume only these two exist.
  correct: boolean;
  points: number; // points EARNED for this question (0 if incorrect)
  possible_points: number; // max points this question was worth
  user_answer: {
    selected_indexes: number[];
    text: string; // CONFIRMED always "" for single/multiple types in real data — likely populated for free-text/essay question types not yet seen
    texts: string[]; // the actual selected answer text(s), in selected_indexes order
  };
  correct_answer: {
    indexes: number[];
    texts: string[];
    text: string; // CONFIRMED: only ever the FIRST correct text, not a join of all — use `texts` for multi-answer questions, not this field
  };
  answers: GradedAnswerOption[]; // per-option selected/is_correct — CONFIRMED, safe to build UI against
  explanation: RichTextField; // CONFIRMED object shape (see RichTextField) — was incorrectly typed as a plain string before
  tip: RichTextField; // NEW, CONFIRMED — empty ("") in every real question seen so far, but structurally present on all of them
  graded: null | unknown; // CONFIRMED always null in real data (all single/multiple auto-graded questions) — likely populated for essay/manually-graded question types, shape unknown
}

// CONFIRMED (Aug 2026): quiz/submit reuses almost the exact same envelope
// as markStepComplete (success, user_id, course_id, step_id, marked,
// already_completed, step_status, step, progress, course_status,
// current_step) — makes sense, since submitting a quiz also completes the
// step in one action. It ADDS `quiz` (summary) and `results` (per-question
// review) on top. success/step/progress/course_status/current_step below
// are typed loosely (not re-declaring MarkStepCompleteResponse's full
// shape) — see that interface above for the confirmed field list.
export interface QuizSubmitResponse {
  success: boolean;
  user_id: number;
  course_id: number;
  step_id: number;
  marked: boolean;
  already_completed: boolean;
  step_status: string;
  step: MarkStepCompleteResponse['step'];
  progress: MarkStepCompleteResponse['progress'];
  course_status: MarkStepCompleteResponse['course_status'];
  current_step: MarkStepCompleteResponse['current_step'];
  // Quiz-level summary — CONFIRMED nested under `quiz`, NOT top-level as
  // earlier assumed.
  quiz: {
    id: number;
    title: string;
    pass: boolean; // CONFIRMED field name is `pass`, not `passed`
    percentage: number;
    score: number; // points earned, total across all questions
    count: number; // number of questions in this attempt
    points: number; // CONFIRMED: same value as `score` in real data — redundant field, prefer `score`
    total_points: number;
    passing_percentage: number;
    has_graded: boolean;
    pending_essay_grade: boolean;
    statistic_ref_id: number;
    can_retake: boolean;
    attempt_count: number;
    timespent: number; // seconds
    timespent_formatted: string; // "00:03:00"
    quiz_key: string; // pass this to getQuizResults to reopen this exact attempt later
    started_at: number; // unix timestamp
    completed_at: number; // unix timestamp
  };
  results: GradedQuestionResult[]; // CONFIRMED top-level (not nested) — per-question review, self-sufficient (question text/type/answers all included), no second call needed
  // CONFIRMED: `attempt` also exists and DUPLICATES quiz_key/pass/
  // percentage/score/etc AND the entire `results` array again inside
  // itself. Redundant with the fields above — use the top-level `quiz`/
  // `results` instead; `attempt` isn't typed out separately here since
  // it's a strict superset duplicate, not new information.
  attempt?: Record<string, any>;
}

export interface QuizResultsResponse extends QuizSubmitResponse {
  attempts?: {attempt_number: number; percentage: number; passed: boolean; completed_at: string}[]; // NOT reconfirmed in this pass — kept from earlier description, unverified whether this field actually exists on the results endpoint
}

/** POST custom/v1/ld-courses/{courseId}/steps/{stepId}/quiz/submit — CONFIRMED (Aug 2026) via real Postman response. The submit response IS the review data, no second call needed for that attempt. */
export const submitQuiz = async (
  courseId: number,
  stepId: number,
  body: QuizSubmitRequest,
): Promise<QuizSubmitResponse | null> => {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${BASE_URL}/custom/v1/ld-courses/${courseId}/steps/${stepId}/quiz/submit`, {
      method: 'POST',
      headers: {...headers, 'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
    // A 409 here means the backend is enforcing sequential step completion
    // — CONFIRMED real case (Aug 2026): "This quiz cannot be attempted yet.
    // Finish earlier required steps first.", with a data.previous_incomplete_id
    // pointing at the exact blocking step. Surface the real message (same
    // pattern as markStepComplete) rather than a bare status code.
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message = (data && data.message) || `${res.status}: submitQuiz`;
      throw new Error(message);
    }
    return data;
  } catch (err) {
    console.error('[coursesApi] submitQuiz', err);
    return null;
  }
};

/** GET custom/v1/ld-courses/{courseId}/steps/{stepId}/quiz/results?quiz_key={quizKey} — CONFIRMED by Robby (Aug 2026). Param CHANGED from ?user_id= (earlier guess) to ?quiz_key= — omit quiz_key entirely to get the latest attempt. Auth comes from the Bearer token (attached automatically by apiFetch), not a user_id param. Response shape assumed to match QuizSubmitResponse (not independently Postman-tested this pass — submitQuiz's response was the one confirmed). */
export const getQuizResults = async (
  courseId: number,
  stepId: number,
  quizKey?: string,
): Promise<QuizResultsResponse | null> => {
  try {
    const path = `/custom/v1/ld-courses/${courseId}/steps/${stepId}/quiz/results${quizKey ? `?quiz_key=${quizKey}` : ''}`;
    const json = await apiFetch(path);
    return json ?? null;
  } catch (err) {
    console.error('[coursesApi] getQuizResults', err);
    return null;
  }
};

// ─── Step comments ───────────────────────────────────────────────────────
// CONFIRMED endpoint contract (described by Robby, July 2026) — same
// caveat as above, field names not yet Postman-verified against a real
// response.

export interface StepComment {
  id: number;
  author_name: string;
  author_avatar: string;
  content: string;
  date_formatted: string;
  replies?: StepComment[];
}

export interface StepCommentsResponse {
  comments: StepComment[];
}

/** GET custom/v1/ld-courses/{courseId}/steps/{stepId}/comments?user_id={userId} — CONFIRMED by Robby (July 2026) */
export const getStepComments = async (
  courseId: number,
  stepId: number,
  userId: number,
): Promise<StepCommentsResponse | null> => {
  try {
    const json = await apiFetch(`/custom/v1/ld-courses/${courseId}/steps/${stepId}/comments?user_id=${userId}`);
    return json ?? null;
  } catch (err) {
    console.error('[coursesApi] getStepComments', err);
    return null;
  }
};

/** POST custom/v1/ld-courses/{courseId}/steps/{stepId}/comments — CONFIRMED by Robby (July 2026) */
export const postStepComment = async (
  courseId: number,
  stepId: number,
  userId: number,
  content: string,
  parentId: number = 0,
): Promise<StepComment | null> => {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${BASE_URL}/custom/v1/ld-courses/${courseId}/steps/${stepId}/comments`, {
      method: 'POST',
      headers: {...headers, 'Content-Type': 'application/json'},
      body: JSON.stringify({user_id: userId, content, parent_id: parentId}),
    });
    if (!res.ok) throw new Error(`${res.status}: postStepComment`);
    return await res.json();
  } catch (err) {
    console.error('[coursesApi] postStepComment', err);
    return null;
  }
};

// NOTE: getCourseDetails and getCourseActivity are now fully confirmed
// (July 2026). Still unconfirmed: the per-tab content endpoints
// (Certifications/FAQs/About Us) returned dynamically in
// CourseDetailsResponse.course.tabs[].endpoint — see
// getCourseDetailTabContent above.

// ─── Recommended course cards (empty-state, "You don't have any courses
// yet" block on the Courses screen's My Courses tab — see
// EmptyCoursesRecommendation component) ─────────────────────────────────
// Moved here from certificationsApi.ts (July 2026) — this is course data,
// not certification data; it only lived there originally because
// EmptyCoursesRecommendation was first built for the Certifications
// screen before CoursesScreen started reusing it too.
//
// LIVE ENDPOINT CONFIRMED (Aug 2026): custom/v1/my-courses/recommended?
// user_id={userId} — real Postman response pasted by Marium, shape below.
// This replaces the need for the hardcoded RECOMMENDED_COURSES list as the
// primary source (it returns a real image, a real permalink that's public
// — not enrollment-gated — and dynamic empty_title/empty_message copy).
// RECOMMENDED_COURSES is kept below ONLY as an offline/error fallback.

export interface RecommendedCourseAPI {
  id: number;
  title: string;
  slug: string;
  description: string;
  image: string;
  permalink: string;
  cta_label: string;
}

export interface RecommendedCoursesResponse {
  user_id: number;
  page_url: string;
  has_courses: boolean;
  should_show: boolean;
  empty_title: string;
  empty_message: string;
  count: number;
  courses: RecommendedCourseAPI[];
}

/** GET custom/v1/my-courses/recommended?user_id={userId} — CONFIRMED via Postman (Aug 2026) */
export const getRecommendedCourses = async (
  userId: number,
): Promise<RecommendedCoursesResponse | null> => {
  try {
    const json = await apiFetch(`/custom/v1/my-courses/recommended?user_id=${userId}`);
    if (!json) return null;
    return {
      ...json,
      courses: Array.isArray(json.courses)
        ? json.courses.map((c: RecommendedCourseAPI) => ({
            ...c,
            title: decodeEntities(c.title),
            description: decodeEntities(c.description),
          }))
        : [],
    };
  } catch (err) {
    console.error('[coursesApi] getRecommendedCourses', err);
    return null;
  }
};

// RECOMMENDED_COURSES is a hardcoded fallback list, not sourced from any
// endpoint. courseId history: first attempt matched these to the
// courses/search catalog's numeric `id` (37996/37997/37998) by URL slug —
// CONFIRMED BROKEN via a live test ("404: /custom/v1/ld-courses/37996/
// details"). That catalog's `id` is a DIFFERENT ID space than
// ld-courses/{id}/details expects.
//
// FIXED: courseId values below now come from the my-courses/in-progress
// list instead, which uses the SAME ID space getCourseDetails() actually
// expects (confirmed working — this is the same list that gave us 174238
// and 22814, both independently verified via live getCourseDetails calls).
// Only 22814 (cpm-level-1) has been independently re-confirmed working for
// THIS specific use; 33355 and 34241 are inferred from the same list/ID
// space but not individually re-tested — should work, but flag if either
// 404s.
export interface RecommendedCourse {
  id: string;
  title: string;
  tagline: string;
  audience: string;
  credentialTags: string; // e.g. "IPMA-D®, CPM Level 1®, EQF Level 6"
  hours: string;
  url: string;
  courseId?: number;
}

// From "Recommended Courses for You" on instituteprojectmanagement.com/ipma-certification/
export const RECOMMENDED_COURSES: RecommendedCourse[] = [
  {
    id: 'cpm-level-1',
    title: 'Certified Project Management Diploma',
    tagline: 'Learn to confidently manage projects and drive successful outcomes.',
    audience: 'For PMs, project team members and aspiring PMs.',
    credentialTags: 'IPMA-D®, CPM Level 1®, EQF Level 6',
    hours: '42 Hours',
    url: 'https://instituteprojectmanagement.com/courses/certified-project-management-diploma/',
    courseId: 22814, // confirmed working (independently re-tested)
  },
  {
    id: 'cpm-level-2',
    title: 'Strategic Project Programme Management Diploma',
    tagline: 'Develop advanced skills in managing programmes and strategic PMOs.',
    audience: 'For those who have approx. 3 years working on projects.',
    credentialTags: 'IPMA-C®, CPM Level 2®, EQF Level 7',
    hours: '42 Hours',
    url: 'https://instituteprojectmanagement.com/courses/strategic-project-programme-management-diploma/',
    courseId: 33355, // from my-courses/in-progress list, same ID space as 22814 — not individually re-tested
  },
  {
    id: 'cpm-level-3',
    title: 'Project Leadership & Management Diploma',
    tagline: 'Master leadership to lead complex projects as Project Director.',
    audience: 'For those who have over 4 years managing complex projects.',
    credentialTags: 'IPMA-B/A®, CPM Level 3®, EQF Level 7',
    hours: '42 Hours',
    url: 'https://instituteprojectmanagement.com/courses/project-leadership-management-diploma/',
    courseId: 34241, // from my-courses/in-progress list, same ID space as 22814 — not individually re-tested
  },
];
