import {getToken} from './feedApi';

// ─────────────────────────────────────────────────────────────────────────
// Confirmed endpoints (Marium, 2026-08-16):
//   Home/tab data:  GET /wp-json/custom/v1/support-hub
//                   — also returns "tabs" (all 5 sections, each with its
//                     own "endpoint" to call when switching category) and
//                     "page" (hero copy — title/banner_title/search
//                     placeholder/etc).
//   Search:         GET /wp-json/custom/v1/support-hub/search?q=<query>
//                   — returns FAQ stubs only (id/title/slug/permalink/
//                     categories) — NO content_html/content_text. To show
//                     an answer for a search hit we resolve it against
//                     whichever category tab we've already cached, falling
//                     back to fetching that tab if we haven't visited it.
//   Glossary has its own "type": "glossary" tab with a "glossary" array
//   (term/definition) instead of "faqs" — search does not cover it
//   (confirmed empty faqs/total:0 for a glossary-only query), so glossary
//   search is done client-side against the already-loaded term list.
// ─────────────────────────────────────────────────────────────────────────

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json/custom/v1';
const DEFAULT_ENDPOINT = `${BASE}/support-hub`;
const SEARCH_ENDPOINT = `${BASE}/support-hub/search`;

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// ─── Entity decode (WP titles/content come through HTML-encoded) ─────────────
const decodeEntities = (text: string): string =>
  (text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .trim();

export const cleanTitle = (text: string): string => decodeEntities((text || '').replace(/<[^>]*>/g, ''));

// ─── Types ─────────────────────────────────────────────────────────────────
export interface FaqCategory {
  id: number;
  slug: string;
  name: string;
}

export interface Faq {
  id: number;
  title: string;
  slug: string;
  permalink: string;
  categories: FaqCategory[];
  content_html?: string;
  content_text?: string;
}

export interface GlossaryTerm {
  id: number;
  title: string;
  slug: string;
  permalink: string;
  letter: string;
  content_html: string;
  content_text: string;
}

export interface HubTab {
  id: string; // 'support' | 'membership' | 'courses' | 'certification' | 'glossary'
  label: string;
  heading: string;
  type: 'faqs' | 'glossary';
  term_slug: string;
  term_id: number;
  icon_url: string;
  endpoint: string;
  search_endpoint: string;
  search_placeholder: string;
}

export interface HubPage {
  title: string;
  heading: string;
  banner_title: string;
  search_placeholder: string;
  search_endpoint: string;
  image_url: string;
  glossary_heading: string;
}

interface TabResponse {
  page?: HubPage;
  tabs?: HubTab[];
  section?: HubTab;
  faqs?: Faq[];
  glossary?: GlossaryTerm[];
}

// ─── Caches ────────────────────────────────────────────────────────────────
// Populated as tabs are visited — lets a search-result "View Answer" resolve
// full content without an extra endpoint (none exists for single-FAQ fetch).
let tabsCache: HubTab[] | null = null;
let pageCache: HubPage | null = null;
const faqCache = new Map<number, Faq>();
const tabDataCache = new Map<string, TabResponse>();
let glossaryCache: GlossaryTerm[] | null = null;

const mapFaq = (f: any): Faq => ({
  ...f,
  title: cleanTitle(f.title || ''),
});

const mapGlossaryTerm = (g: any): GlossaryTerm => ({
  ...g,
  title: cleanTitle(g.title || ''),
});

// ─── Fetch a tab's data (defaults to Support, the initial screen) ───────────
export const getSupportHubTab = async (endpoint: string = DEFAULT_ENDPOINT): Promise<TabResponse | null> => {
  const cached = tabDataCache.get(endpoint);
  if (cached) return cached;

  try {
    const headers = await authHeaders();
    const res = await fetch(endpoint, {headers});
    if (!res.ok) return null;
    const data = await res.json();

    if (data.page) pageCache = data.page;
    if (Array.isArray(data.tabs)) tabsCache = data.tabs;

    const mapped: TabResponse = {
      page: data.page,
      tabs: data.tabs,
      section: data.section,
      faqs: Array.isArray(data.faqs) ? data.faqs.map(mapFaq) : undefined,
      glossary: Array.isArray(data.glossary) ? data.glossary.map(mapGlossaryTerm) : undefined,
    };

    mapped.faqs?.forEach(f => faqCache.set(f.id, f));
    if (mapped.glossary) glossaryCache = mapped.glossary;

    tabDataCache.set(endpoint, mapped);
    return mapped;
  } catch {
    return null;
  }
};

export const getHubPage = async (): Promise<HubPage | null> => {
  if (pageCache) return pageCache;
  const data = await getSupportHubTab(DEFAULT_ENDPOINT);
  return data?.page ?? null;
};

export const getHubTabs = async (): Promise<HubTab[]> => {
  if (tabsCache) return tabsCache;
  const data = await getSupportHubTab(DEFAULT_ENDPOINT);
  return data?.tabs ?? [];
};

// ─── Search (Support tab only covers FAQs — glossary handled separately) ────
export const searchSupportHub = async (
  query: string,
): Promise<{search: string; faqs: Faq[]; total: number}> => {
  const q = query.trim();
  if (!q) return {search: '', faqs: [], total: 0};
  try {
    const headers = await authHeaders();
    const res = await fetch(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(q)}`, {headers});
    if (!res.ok) return {search: q, faqs: [], total: 0};
    const data = await res.json();
    const faqs: Faq[] = Array.isArray(data.faqs) ? data.faqs.map(mapFaq) : [];
    // Merge in any content we already have cached from a visited tab.
    const merged = faqs.map(f => {
      const cached = faqCache.get(f.id);
      return cached?.content_html ? {...f, ...cached} : f;
    });
    return {search: data.search ?? q, faqs: merged, total: data.total ?? merged.length};
  } catch {
    return {search: q, faqs: [], total: 0};
  }
};

// ─── Resolve full content for a FAQ stub (from search or a related list) ────
// The search endpoint doesn't return content, and there's no single-FAQ
// detail endpoint — so this walks the FAQ's own categories to find which
// tab owns it, fetches that tab (cached after first time), and pulls the
// full entry out of its faqs list.
export const getFaqDetail = async (faq: Faq): Promise<Faq> => {
  const cached = faqCache.get(faq.id);
  if (cached?.content_html) return cached;

  const tabs = await getHubTabs();
  for (const cat of faq.categories || []) {
    const tab = tabs.find(t => t.term_slug === cat.slug);
    if (!tab) continue;
    const data = await getSupportHubTab(tab.endpoint);
    const found = data?.faqs?.find(f => f.id === faq.id);
    if (found?.content_html) return found;
  }
  return faq;
};

// ─── Other FAQs in the same category (used for the "Related FAQ" section —
// the API has no explicit "related" field) ───────────────────────────────
export const getRelatedFaqs = (faq: Faq, allInCategory: Faq[], max = 3): Faq[] =>
  allInCategory.filter(f => f.id !== faq.id).slice(0, max);

// ─── Glossary ──────────────────────────────────────────────────────────────
export const getGlossary = async (): Promise<GlossaryTerm[]> => {
  if (glossaryCache) return glossaryCache;
  const tabs = await getHubTabs();
  const glossaryTab = tabs.find(t => t.type === 'glossary');
  const endpoint = glossaryTab?.endpoint || `${BASE}/glossary-dictionary`;
  const data = await getSupportHubTab(endpoint);
  return data?.glossary ?? [];
};

export const searchGlossary = (query: string, terms: GlossaryTerm[]): GlossaryTerm[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return terms.filter(t => t.title.toLowerCase().includes(q));
};

// ─── HTML → renderable blocks (paragraphs / bullet list items) ─────────────
// FAQ content_html is simple WP output — <p> and <ul><li> (occasionally
// with an <a href="mailto:...">). Kept intentionally lightweight rather
// than pulling in the full resourcesApi content-block parser (tables,
// images, course cards, etc.) since Support Hub answers don't use any of
// that.
export interface FaqTextSegment {
  text: string;
  url?: string;
}

export interface FaqContentBlock {
  type: 'paragraph' | 'bullet';
  segments: FaqTextSegment[];
}

const parseInlineSegments = (html: string): FaqTextSegment[] => {
  const segments: FaqTextSegment[] = [];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    if (m.index > lastIndex) {
      const before = decodeEntities(html.slice(lastIndex, m.index).replace(/<[^>]*>/g, ''));
      if (before) segments.push({text: before});
    }
    const linkText = decodeEntities(m[2].replace(/<[^>]*>/g, ''));
    if (linkText) segments.push({text: linkText, url: m[1]});
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < html.length) {
    const after = decodeEntities(html.slice(lastIndex).replace(/<[^>]*>/g, ''));
    if (after) segments.push({text: after});
  }
  return segments;
};

export const parseFaqHtml = (html: string): FaqContentBlock[] => {
  if (!html) return [];
  const blocks: FaqContentBlock[] = [];
  const blockRegex = /<p[^>]*>([\s\S]*?)<\/p>|<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(html)) !== null) {
    const isBullet = m[2] !== undefined;
    const segments = parseInlineSegments((isBullet ? m[2] : m[1]) || '');
    if (segments.some(s => s.text.trim())) {
      blocks.push({type: isBullet ? 'bullet' : 'paragraph', segments});
    }
  }
  return blocks;
};

// ─── Reset caches (e.g. pull-to-refresh) ────────────────────────────────────
export const resetSupportHubCache = () => {
  tabsCache = null;
  pageCache = null;
  glossaryCache = null;
  faqCache.clear();
  tabDataCache.clear();
};
