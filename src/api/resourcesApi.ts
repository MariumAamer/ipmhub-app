import {getToken} from './feedApi';

// ─── Decode HTML entities ─────────────────────────────────────────────────────
// API titles come through with encoded entities (&#038;, &#8217;, &amp;, etc.)
// since they're WP post titles. stripHtml() (feedApi) only handles &nbsp;/&amp;,
// so we decode numeric + the common named entities here before display.
const decodeEntities = (text: string): string =>
  (text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();

// ─── Strip HTML tags + decode entities (for titles/excerpts) ────────────────
// IMPORTANT: strip entire <style>/<script> blocks (tags AND their
// content) before removing remaining tags. WordPress content sometimes
// embeds custom CTA boxes via inline <style>...</style> blocks (e.g. a
// ".ipm-cta-top{...}" rule set) — the old version only stripped the
// <style> tags themselves via the generic tag regex, leaving the raw
// CSS text inside as plain content, which then rendered on-screen as if
// it were a real paragraph.
export const cleanText = (html: string): string =>
  decodeEntities(
    (html || '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ''),
  );

// Re-exported so screens that import date formatting alongside resource
// helpers (e.g. ResourcesScreen.tsx) don't need a second import from feedApi.
export const formatDate = (d: string): string => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-IE', {day: 'numeric', month: 'short', year: 'numeric'});
};

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json/custom/v1/resources';

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// ─── Config / Tabs / Categories ───────────────────────────────────────────────
export interface SubmitResourceConfig {
  title: string;
  url: string;
  image_url: string;
}

export interface ResourcesPageConfig {
  title: string;
  subtitle: string;
  search_placeholder: string;
  submit_resource: SubmitResourceConfig;
}

export interface ResourceTab {
  id: string; // 'all' | 'articles' | 'ebooks' | 'templates' | 'videos' | 'cheatsheets'
  label: string;
  category_ids: number[];
  tab_type: string;
  hash: string;
}

export interface ResourceCategory {
  id: string; // '' for "All Categories"
  label: string;
}

let configCache: ResourcesPageConfig | null = null;
let tabsCache: ResourceTab[] | null = null;
let categoriesCache: ResourceCategory[] | null = null;

export const getResourcesConfig = async (): Promise<ResourcesPageConfig | null> => {
  if (configCache) return configCache;
  try {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/config`, {headers});
    if (!res.ok) return null;
    const data = await res.json();
    configCache = data?.page ?? null;
    return configCache;
  } catch {
    return null;
  }
};

export const getResourceTabs = async (): Promise<ResourceTab[]> => {
  if (tabsCache) return tabsCache;
  try {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/tabs`, {headers});
    if (!res.ok) return [];
    const data = await res.json();
    tabsCache = Array.isArray(data?.tabs) ? data.tabs : [];
    return tabsCache;
  } catch {
    return [];
  }
};

export const getResourceCategories = async (): Promise<ResourceCategory[]> => {
  if (categoriesCache) return categoriesCache;
  try {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/categories`, {headers});
    if (!res.ok) return [];
    const data = await res.json();
    categoriesCache = Array.isArray(data?.categories) ? data.categories : [];
    return categoriesCache;
  } catch {
    return [];
  }
};

// ─── Resource item shape (list endpoints) ─────────────────────────────────────
export interface ResourceAuthor {
  user_id: number;
  full_name: string;
  avatar: string | null;
  profile_url: string;
}

export interface ResourceItem {
  id: number | string; // videos use a YouTube string id
  type: string; // 'articles' | 'templates' | 'ebooks' | 'video' | 'cheatsheet'
  title: string;
  image_url: string | null;
  header_image_url?: string | null;
  date?: string;
  date_formatted?: string;
  category_label?: string;
  type_label: string;
  is_featured: boolean;
  is_member_only: boolean;
  member_only_label?: string;
  permalink: string;
  author: ResourceAuthor | null;
  // videos only
  duration?: string;
  video_id?: string;
  video_embed_url?: string;
}

export interface ResourcePagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  showing_start: number;
  showing_end: number;
  has_more: boolean;
}

export interface ResourcesListResult {
  items: ResourceItem[];
  pagination: ResourcePagination;
  submitResource: SubmitResourceConfig | null;
  // Known backend quirk: the search endpoint currently ignores the `tab`
  // filter and searches across all resources regardless of the active tab.
  // Flagged to Robby — surfaced here so screens/callers can react to it
  // (e.g. show "Searching all resources" instead of silently mismatching).
  tabIgnored?: boolean;
}

const mapItem = (raw: any): ResourceItem => ({
  ...raw,
  title: cleanText(raw.title || ''),
});

// ─── Fetch resources by tab/category/search/page ──────────────────────────────
export const getResources = async (
  tab: string,
  page = 1,
  search = '',
  categoryId: string | number | null = null,
): Promise<ResourcesListResult> => {
  const headers = await authHeaders();

  let url = `${BASE}/items?tab=${encodeURIComponent(tab)}&page=${page}`;
  if (categoryId !== null && categoryId !== '' && categoryId !== undefined) {
    url += `&category=${encodeURIComponent(String(categoryId))}`;
  }
  if (search) url += `&search=${encodeURIComponent(search)}`;

  const res = await fetch(url, {headers});
  if (!res.ok) {
    return {
      items: [],
      pagination: {total: 0, page: 1, per_page: 8, total_pages: 0, showing_start: 0, showing_end: 0, has_more: false},
      submitResource: null,
    };
  }
  const data = await res.json();

  return {
    items: Array.isArray(data.items) ? data.items.map(mapItem) : [],
    pagination: data.pagination ?? {
      total: 0, page: 1, per_page: 8, total_pages: 0, showing_start: 0, showing_end: 0, has_more: false,
    },
    submitResource: data.submit_resource ?? null,
    tabIgnored: !!data.tab_ignored,
  };
};

// ─── Table of contents / section splitting (for article detail) ─────────────
export interface TOCEntry {
  id: string;
  text: string;
  level: number;
}

// ─── Content blocks (images, buttons, video embeds) ───────────────────────
// Article/ebook HTML embeds real media — <figure><img>, CTA buttons
// (<div class="global-download-btn">), YouTube <iframe> embeds — that
// cleanText() was previously stripping to nothing since it only knows
// how to produce plain text. This extracts those as structured blocks
// so the screen can render an actual <Image>, a tappable button, or a
// "Watch video" link instead of silently losing them.
export interface TextSegment {
  text: string;
  url?: string;
}

export interface ContentBlock {
  type: 'text' | 'image' | 'button' | 'video' | 'table' | 'course' | 'list';
  text?: string;
  src?: string;
  alt?: string;
  url?: string;
  rows?: string[][];
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryUrl?: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
  segments?: TextSegment[];
  items?: TextSegment[][];
  ordered?: boolean;
  startNumber?: number;
}

const extractAttr = (tag: string, attr: string): string | undefined => {
  const m = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, 'i'));
  // Attribute values (especially href/src with query strings like
  // "?a=1&#038;b=2") come through HTML-entity-encoded same as text
  // content — was returning the raw match, leaving a literal "&#038;"
  // in URLs instead of "&", which could break the link when opened.
  return m ? decodeEntitiesNoTrim(m[1]) : undefined;
};

// Generic — works on any standard <table><tr><td>/<th> markup, not tied
// to any site-specific class names. Previously tables fell through to
// cleanText(), which strips all tags with no separators at all, so
// "Field" + "Purpose" + "Risk ID" + "Unique reference..." all ran
// together into one unreadable blob with zero spacing between cells.
const parseTableRows = (tableHtml: string): string[][] => {
  const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  return rowMatches
    .map(rowMatch => {
      const cellMatches = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)];
      return cellMatches.map(cellMatch => cleanText(cellMatch[1]));
    })
    .filter(row => row.length > 0);
};

// Same as decodeEntities but WITHOUT trimming — needed for inline text
// segments split around a link. cleanText()/decodeEntities() trims each
// piece, which is fine for a standalone chunk but breaks word spacing
// when segments get concatenated: "Our " (trimmed to "Our") + a link +
// " is built" (trimmed to "is built") would render as
// "Ourpredictive Gantt chart templateis built" with the boundary spaces
// gone. This keeps interior whitespace intact.
const cleanInline = (html: string): string =>
  decodeEntitiesNoTrim((html || '').replace(/<[^>]*>/g, '')).replace(/\n\s*\n+/g, ' ');

const decodeEntitiesNoTrim = (text: string): string =>
  (text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

// Splits a chunk of inline HTML (paragraph or <li> content) into plain
// text + link segments, preserving order and surrounding whitespace.
// Previously every <a href> inside a paragraph was silently stripped to
// plain, non-tappable text along with everything else — e.g.
// "predictive Gantt chart template" losing its underline and link
// entirely, even though the source HTML had a real href.
const parseTextSegments = (html: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    if (m.index > lastIndex) {
      const before = cleanInline(html.slice(lastIndex, m.index));
      if (before) segments.push({text: before});
    }
    const linkText = cleanInline(m[2]);
    const href = m[1];
    if (linkText) {
      segments.push(href.startsWith('javascript:') ? {text: linkText} : {text: linkText, url: href});
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < html.length) {
    const after = cleanInline(html.slice(lastIndex));
    if (after) segments.push({text: after});
  }
  return segments;
};

// Generic — works on any standard <ol>/<ul>/<li> markup. Previously
// list tags were stripped with no marker or spacing inserted at all,
// so "1. The Discovery: ... 2. The Response: ..." (or bullet lists)
// rendered as one unbroken run-on paragraph with no numbers, bullets,
// or breaks between items.
const parseListItems = (listHtml: string): TextSegment[][] => {
  const liMatches = [...listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  return liMatches
    .map(m => parseTextSegments(m[1]))
    .filter(segs => segs.some(s => s.text.trim()));
};

// Finds the index right after the <div> that closes the one opened at
// `openTagEnd`, correctly handling nested <div>s by depth-counting —
// a plain non-greedy regex (<div>[\s\S]*?<\/div>) would stop at the
// FIRST </div> it finds, which for a banner like ipm-cta-banner (with
// nested ipm-cta-top > ipm-cta-text/ipm-cta-image divs inside) is the
// wrong one entirely.
const findBalancedDivEnd = (html: string, openTagEnd: number): number => {
  let depth = 1;
  const re = /<div\b[^>]*>|<\/div>/gi;
  re.lastIndex = openTagEnd;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[0].toLowerCase().startsWith('</div')) depth--;
    else depth++;
    if (depth === 0) return m.index + m[0].length;
  }
  return html.length;
};

interface CourseCardData {
  title: string;
  description: string;
  imageSrc?: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
}

// Site-wide reusable "course promo" component (class ipm-cta-banner —
// confirmed present verbatim across multiple articles). Extracts it
// using the balanced-div scanner above, then reads out title (<h3>),
// description (<p>), circular image (<img> inside .ipm-cta-image), and
// its two buttons. Some of these buttons use href="javascript:void(0);"
// with the real destination in a data-link attribute (a JS popup
// trigger the app can't run) — falls back to data-link in that case so
// the button still goes somewhere real.
const extractCourseCards = (html: string): {text: string; cards: CourseCardData[]} => {
  const cards: CourseCardData[] = [];
  let result = '';
  let cursor = 0;
  const openRe = /<div[^>]*class="[^"]*ipm-cta-banner[^"]*"[^>]*>/gi;
  let m: RegExpExecArray | null;

  while ((m = openRe.exec(html)) !== null) {
    if (m.index < cursor) continue;
    result += html.slice(cursor, m.index);
    const openEnd = m.index + m[0].length;
    const closeEnd = findBalancedDivEnd(html, openEnd);
    const block = html.slice(m.index, closeEnd);

    const title = cleanText(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || '');
    const description = cleanText(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
    const imageSrc = extractAttr(block.match(/<img[^>]*>/i)?.[0] || '', 'src');

    const anchors = [...block.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)];
    let primaryLabel = '', primaryUrl = '', secondaryLabel = '', secondaryUrl = '';
    anchors.forEach((am, i) => {
      const a = am[0];
      const label = cleanText(a.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] || a);
      const href = extractAttr(a, 'href') || '';
      const dataLink = extractAttr(a, 'data-link');
      const url = href.startsWith('javascript:') ? (dataLink || '') : href;
      if (i === 0) {
        primaryLabel = label;
        primaryUrl = url;
      } else if (i === 1) {
        secondaryLabel = label;
        secondaryUrl = url;
      }
    });

    if (title && (primaryUrl || secondaryUrl)) {
      cards.push({
        title,
        description,
        imageSrc,
        primaryLabel: primaryLabel || 'Learn more',
        primaryUrl,
        secondaryLabel: secondaryLabel || 'View Course',
        secondaryUrl,
      });
      // Null-byte marker: guaranteed not to appear in real HTML/CSS
      // text, so it survives cleanText() untouched and can be swapped
      // back out for the real course block afterward.
      result += `\u0000COURSE_${cards.length - 1}\u0000`;
    } else {
      // Didn't match the expected shape — keep the raw block rather
      // than silently dropping it, so at worst it degrades to stripped
      // text instead of disappearing entirely.
      result += block;
    }
    cursor = closeEnd;
  }
  result += html.slice(cursor);
  return {text: result, cards};
};

export const parseContentBlocks = (html: string, cards: CourseCardData[] = []): ContentBlock[] => {
  if (!html) return [];

  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  // Matches, in document order: an image figure, a CTA button div, a
  // table, or a video iframe. Everything else falls through as plain
  // text between matches (including course-card markers, unpacked in
  // pushText below).
  const blockRegex =
    /<figure[^>]*wp-block-image[^>]*>[\s\S]*?<\/figure>|<div[^>]*global-download-btn[^>]*>[\s\S]*?<\/div>|<table[^>]*>[\s\S]*?<\/table>|<iframe[^>]*>[\s\S]*?<\/iframe>|<ol[^>]*>[\s\S]*?<\/ol>|<ul[^>]*>[\s\S]*?<\/ul>/gi;

  const blocks: ContentBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushText = (chunk: string) => {
    const parts = chunk.split(/\u0000COURSE_(\d+)\u0000/);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Split on <p> boundaries so each paragraph becomes its own
        // block. Previously multiple <p> tags inside one chunk (i.e.
        // nothing else — image/button/table — separated them) were
        // joined into a single text block, and WordPress's paragraph
        // spacing ("</p>\n\n\n\n<p>") survived as four literal newline
        // characters inside that one block. React Native renders \n as
        // real line breaks, so that produced ~3 blank lines of empty
        // space between paragraphs instead of a controlled marginBottom.
        const paraChunks = parts[i].split(/<p\b[^>]*>|<\/p>/gi).filter(p => p.trim());
        const toProcess = paraChunks.length ? paraChunks : [parts[i]];
        toProcess.forEach(paraHtml => {
          const segments = parseTextSegments(paraHtml);
          if (segments.some(s => s.text.trim())) {
            blocks.push({type: 'text', text: segments.map(s => s.text).join(''), segments});
          }
        });
      } else {
        const card = cards[parseInt(parts[i], 10)];
        if (card) blocks.push({type: 'course', ...card});
      }
    }
  };

  while ((match = blockRegex.exec(stripped)) !== null) {
    if (match.index > lastIndex) {
      pushText(stripped.slice(lastIndex, match.index));
    }

    const matched = match[0];
    if (matched.startsWith('<figure')) {
      const imgTag = matched.match(/<img[^>]*>/i)?.[0] || '';
      const src = extractAttr(imgTag, 'src');
      const alt = extractAttr(imgTag, 'alt');
      if (src) blocks.push({type: 'image', src, alt});
    } else if (matched.startsWith('<div')) {
      const anchorTag = matched.match(/<a[^>]*>/i)?.[0] || '';
      const href = extractAttr(anchorTag, 'href') || '';
      // These buttons commonly use href="javascript:void(0);" (a JS
      // popup trigger the app can't run) with the real destination in
      // data-link — was previously using href directly, which meant
      // tapping "Download Free Template" tried to open the literal
      // string "javascript:void(0);" as a URL and did nothing.
      const dataLink = extractAttr(anchorTag, 'data-link');
      const url = href.startsWith('javascript:') ? (dataLink || '') : href;
      const label = cleanText(matched.match(/<span[^>]*class="text"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || matched);
      if (url) blocks.push({type: 'button', text: label || 'Learn more', url});
    } else if (matched.startsWith('<table')) {
      const rows = parseTableRows(matched);
      if (rows.length) blocks.push({type: 'table', rows});
    } else if (matched.startsWith('<iframe')) {
      const src = extractAttr(matched, 'src');
      if (src) blocks.push({type: 'video', text: 'Watch video', url: src});
    } else if (matched.startsWith('<ol') || matched.startsWith('<ul')) {
      const ordered = matched.startsWith('<ol');
      const startMatch = matched.match(/<ol[^>]*\bstart=["'](\d+)["']/i);
      const startNumber = startMatch ? parseInt(startMatch[1], 10) : 1;
      const items = parseListItems(matched);
      if (items.length) blocks.push({type: 'list', ordered, startNumber, items});
    }

    lastIndex = match.index + matched.length;
  }

  if (lastIndex < stripped.length) {
    pushText(stripped.slice(lastIndex));
  }

  return blocks;
};

export interface ArticleSection {
  id: string;
  heading: string | null;
  level: number;
  body: string;
  blocks: ContentBlock[];
}

export const splitIntoSections = (html: string): ArticleSection[] => {
  if (!html) return [];

  // CRITICAL: extract course-card banners (ipm-cta-banner) BEFORE
  // scanning for section headings, not after. The banner's own title
  // uses <h3> internally — if heading-splitting runs first, it slices
  // the banner in half at that <h3> (the opening <div> stays in the
  // previous section, everything else becomes an orphaned new
  // "section"), so parseContentBlocks can never find a complete banner
  // to extract per-section and it falls through to plain text. This
  // was confirmed by directly running this exact code against a real
  // course-banner article and inspecting the output — the banner's own
  // <h3> was showing up as a section heading, which is the bug.
  const preStripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
  const {text: withMarkers, cards} = extractCourseCards(preStripped);

  const headingRegex = /<h[2-4][^>]*>.*?<\/h[2-4]>/gi;
  const headingMatches = [...withMarkers.matchAll(headingRegex)];

  if (headingMatches.length === 0) {
    return [{id: 'toc-intro', heading: null, level: 0, body: cleanText(withMarkers), blocks: parseContentBlocks(withMarkers, cards)}];
  }

  const sections: ArticleSection[] = [];
  const firstHeadingIndex = headingMatches[0].index ?? 0;
  if (firstHeadingIndex > 0) {
    const introHtml = withMarkers.slice(0, firstHeadingIndex);
    const introText = cleanText(introHtml);
    if (introText || parseContentBlocks(introHtml, cards).length) {
      sections.push({id: 'toc-intro', heading: null, level: 0, body: introText, blocks: parseContentBlocks(introHtml, cards)});
    }
  }

  headingMatches.forEach((match, i) => {
    const headingHtml = match[0];
    const level = parseInt(headingHtml.match(/<h([2-4])/i)?.[1] || '2', 10);
    const heading = cleanText(headingHtml);
    const start = (match.index ?? 0) + headingHtml.length;
    const end = headingMatches[i + 1]?.index ?? withMarkers.length;
    const sectionHtml = withMarkers.slice(start, end);
    const body = cleanText(sectionHtml);
    sections.push({id: `toc-${i}`, heading, level, body, blocks: parseContentBlocks(sectionHtml, cards)});
  });

  return sections;
};

export const extractTOC = (html: string): TOCEntry[] =>
  splitIntoSections(html)
    .filter(sec => sec.heading)
    .map(sec => ({id: sec.id, text: sec.heading as string, level: sec.level}))
    .slice(0, 12);

// ─── Single resource detail shape ─────────────────────────────────────────────
export interface ResourceTaxonomy {
  id: number;
  name: string;
  link: string;
}

export interface ResourceDetail {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  date: string;
  date_formatted: string;
  image_url: string | null;
  header_image_url: string | null;
  brochure_url?: string;
  categories: number[];
  tags: number[];
  category: ResourceTaxonomy | null;
  tag: ResourceTaxonomy | null;
  is_member_only: boolean;
  permalink: string;
  tableOfContents: TOCEntry[];
}

// ─── Single resource by ID (article/template/ebook/cheatsheet detail) ───────
export const getResourceById = async (id: number | string): Promise<ResourceDetail | null> => {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/items/${id}`, {headers});
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.resource;
    if (!r) return null;

    const content = r.content || '';
    return {
      id: r.id,
      title: cleanText(r.title || ''),
      content,
      excerpt: cleanText(r.excerpt || ''),
      date: r.date,
      date_formatted: r.date_formatted,
      image_url: r.image_url ?? null,
      header_image_url: r.header_image_url ?? r.image_url ?? null,
      brochure_url: r.brochure_url ?? '',
      categories: r.categories ?? [],
      tags: r.tags ?? [],
      category: r.category ?? null,
      tag: r.tag ?? null,
      is_member_only: !!r.is_member_only,
      permalink: r.permalink || '',
      tableOfContents: extractTOC(content),
    };
  } catch {
    return null;
  }
};

// ─── Submit article (resource submission form) ──────────────────────────────
// ⚠️ UNCONFIRMED ENDPOINT — this was never verified via Postman like every
// other endpoint in this project. The URL, field names, and even whether
// this endpoint exists at all are guesses. Confirm the real endpoint +
// field names with Robby before relying on this to actually submit.
export interface ArticleSubmission {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  fileUri: string;
  fileName: string;
  bio: string;
  profilePictureUri: string;
  profilePictureName: string;
  linkedinUrl: string;
  instagramUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
}

export const submitArticle = async (
  submission: ArticleSubmission,
): Promise<boolean> => {
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append('first_name', submission.firstName);
    formData.append('last_name', submission.lastName);
    formData.append('job_title', submission.jobTitle);
    formData.append('email', submission.email);
    formData.append('bio', submission.bio);
    formData.append('linkedin_url', submission.linkedinUrl);
    if (submission.instagramUrl) formData.append('instagram_url', submission.instagramUrl);
    if (submission.twitterUrl) formData.append('twitter_url', submission.twitterUrl);
    if (submission.facebookUrl) formData.append('facebook_url', submission.facebookUrl);
    formData.append('file', {
      uri: submission.fileUri,
      name: submission.fileName,
      type: submission.fileName.endsWith('.pdf')
        ? 'application/pdf'
        : 'application/msword',
    } as any);
    formData.append('profile_picture', {
      uri: submission.profilePictureUri,
      name: submission.profilePictureName,
      type: 'image/jpeg',
    } as any);

    const headers: any = token ? {Authorization: `Bearer ${token}`} : {};
    const res = await fetch(
      'https://hub.instituteprojectmanagement.com/wp-json/ipm/v1/resource-submission',
      {method: 'POST', headers, body: formData},
    );
    return res.ok;
  } catch {
    return false;
  }
};
