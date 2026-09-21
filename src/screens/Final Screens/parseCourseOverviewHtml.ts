/* eslint-disable prettier/prettier */
// src/utils/parseCourseOverviewHtml.ts
//
// Purpose-built parser for the specific WordPress HTML template IPM's
// course_overview field uses (confirmed via Postman, July 2026):
//   <h2 class="courses-heading">...</h2>
//   <p>...</p>
//   <ul>/<ol> with <li> items
//   <div class="courses-columns"><div class="courses-col-first">...</div>...</div>
//
// This is deliberately NOT a general HTML renderer — it's a small regex
// based extractor tuned to this one known template, used because no HTML
// rendering library (e.g. react-native-render-html) is confirmed as a
// project dependency yet. If IPM's content team changes this template
// structure, or if other course_overview values use different markup,
// blocks may be dropped or mis-ordered. Flag to Marium if a course's
// Overview tab renders incompletely — that's the signal this needs a
// real HTML renderer instead.

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'video' | 'image';
  text?: string;
  items?: string[];
  ordered?: boolean;
  videoUrl?: string; // for type: 'video'
  imageUrl?: string; // for type: 'image'
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&reg;/g, '®')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#038;/g, '&');

const stripInlineTags = (s: string) => decodeEntities(s.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')).trim();

// A paragraph whose ENTIRE stripped text is just one URL, matching a known
// video host/extension — confirmed real pattern from getStepContent's html
// (July 2026): <p>https://vimeo.com/736580553</p>, no iframe, no wrapper,
// just a bare link. YouTube/direct-file variants included defensively even
// though only Vimeo has been seen in a populated sample so far.
const BARE_VIDEO_URL_REGEX =
  /^https?:\/\/\S*(vimeo\.com|youtube\.com|youtu\.be|\.mp4|\.mov|\.webm)\S*$/i;

/** Splits a single <p>...</p> block's raw inner HTML into one or more
 * blocks — a paragraph can contain embedded <img> tags mixed with text
 * (confirmed real pattern: tutorial-style paragraphs with inline
 * screenshots), so each image becomes its own 'image' block and the
 * surrounding text becomes separate paragraph blocks around it, in order.
 * A paragraph that is ONLY a bare video URL becomes a single 'video' block
 * instead of text. srcset/sizes attributes on <img> are ignored — only the
 * base `src` is used. */
function processParagraphInner(inner: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const imgRegex = /<img[^>]*\ssrc="([^"]+)"[^>]*>/g;
  let lastIndex = 0;
  let imgMatch: RegExpExecArray | null;
  let foundImage = false;

  while ((imgMatch = imgRegex.exec(inner)) !== null) {
    foundImage = true;
    const before = inner.slice(lastIndex, imgMatch.index);
    const text = stripInlineTags(before);
    if (text) blocks.push({type: 'paragraph', text});
    blocks.push({type: 'image', imageUrl: imgMatch[1]});
    lastIndex = imgRegex.lastIndex;
  }

  if (foundImage) {
    const after = inner.slice(lastIndex);
    const text = stripInlineTags(after);
    if (text) blocks.push({type: 'paragraph', text});
    return blocks;
  }

  // CONFIRMED bug fix (July 2026): a paragraph can also contain a bare
  // <iframe src="..."> with no wp-block-video figure wrapper at all —
  // confirmed real pattern: <p><iframe src="https://player.vimeo.com/
  // video/...">...</iframe></p>. Previously the generic tag-stripper
  // below just deleted the whole iframe tag (attributes included),
  // silently dropping the video with no block emitted for it at all.
  const iframeMatch = /<iframe[^>]*\ssrc="([^"]+)"[^>]*>/i.exec(inner);
  if (iframeMatch) {
    return [{type: 'video', videoUrl: iframeMatch[1]}];
  }

  // No images — check for the bare-video-URL case before falling back to
  // a normal paragraph.
  const text = stripInlineTags(inner);
  if (!text) return [];
  if (BARE_VIDEO_URL_REGEX.test(text)) {
    return [{type: 'video', videoUrl: text}];
  }
  return [{type: 'paragraph', text}];
}

/** Extracts ordered content blocks (heading/paragraph/list/video/image)
 * from a string of HTML, flattening any courses-columns two-column divs
 * into the same sequential list (which happens to match the intended
 * reading order: About the Course -> Course Modules -> Learning
 * Outcomes). Also handles WordPress's <figure class="wp-block-video">
 * embed pattern (confirmed on the About Us tab) AND bare video URLs /
 * embedded <img> tags inside paragraphs (confirmed on Step Content,
 * July 2026 — that markup has NO figure/wp-block wrapper at all, just a
 * plain <p> containing either a raw video link or inline <img> tags mixed
 * with text). */
export function parseCourseOverviewHtml(html: string): ContentBlock[] {
  if (!html) return [];

  // Drop the wrapping div tags for courses-columns/courses-col-first —
  // their CONTENT stays in place, we just don't need the column grouping
  // for a single-column mobile layout.
  const flattened = html.replace(/<div[^>]*class="[^"]*courses-[^"]*"[^>]*>/g, '').replace(/<\/div>/g, '');

  const blocks: ContentBlock[] = [];
  // Matches h2, h3, p, ul, ol, or a wp-block-video figure, in source order
  // (dotall via [\s\S]). h3 support added for Instructors' profile HTML
  // (confirmed via Postman, July 2026 — used for a role title like
  // "Course Director" at the top of some instructors' bios).
  const blockRegex =
    /<h2[^>]*>([\s\S]*?)<\/h2>|<h3[^>]*>([\s\S]*?)<\/h3>|<p[^>]*>([\s\S]*?)<\/p>|<(ul|ol)[^>]*>([\s\S]*?)<\/\4>|<figure[^>]*class="[^"]*wp-block-video[^"]*"[^>]*>([\s\S]*?)<\/figure>/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(flattened)) !== null) {
    const [, h2Inner, h3Inner, paragraphInner, listTag, listInner, videoFigureInner] = match;
    const headingInner = h2Inner !== undefined ? h2Inner : h3Inner;

    if (headingInner !== undefined) {
      const text = stripInlineTags(headingInner);
      if (text) blocks.push({type: 'heading', text});
    } else if (paragraphInner !== undefined) {
      blocks.push(...processParagraphInner(paragraphInner));
    } else if (listInner !== undefined) {
      const items: string[] = [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(listInner)) !== null) {
        const item = stripInlineTags(liMatch[1]);
        if (item) items.push(item);
      }
      if (items.length) blocks.push({type: 'list', items, ordered: listTag === 'ol'});
    } else if (videoFigureInner !== undefined) {
      const srcMatch = /<iframe[^>]*src="([^"]+)"/.exec(videoFigureInner);
      if (srcMatch) blocks.push({type: 'video', videoUrl: srcMatch[1]});
    }
  }

  return blocks;
}

export interface ParsedFaqs {
  heading: string;
  faqs: {question: string; answer: string}[];
}

/** Purpose-built parser for IPM's FAQs tab content (confirmed via Postman,
 * July 2026) — a WP "wpsm_accordion" shortcode blob containing embedded
 * <style>/<script> tags plus repeated panel divs. Extracts the h3 heading
 * and each question (span.ac_title_class) / answer (div.wpsm_panel-body)
 * pair, in source order. Same caveat as the course-overview parser above:
 * tuned to this one known template, not a general HTML parser. */
export function parseFaqsHtml(html: string): ParsedFaqs {
  if (!html) return {heading: '', faqs: []};

  // Strip <style>...</style> and <script>...</script> blocks entirely —
  // they're not content, and can otherwise confuse a naive tag stripper.
  const cleaned = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');

  const headingMatch = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(cleaned);
  const heading = headingMatch ? stripInlineTags(headingMatch[1]) : '';

  const questions: string[] = [];
  const questionRegex = /<span class="ac_title_class">([\s\S]*?)<\/span>/g;
  let qMatch: RegExpExecArray | null;
  while ((qMatch = questionRegex.exec(cleaned)) !== null) {
    questions.push(stripInlineTags(qMatch[1]));
  }

  const answers: string[] = [];
  const answerRegex = /<div class="wpsm_panel-body">\s*([\s\S]*?)<\/div>/g;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = answerRegex.exec(cleaned)) !== null) {
    // Preserve paragraph breaks (<br>) as newlines before stripping tags.
    const withBreaks = aMatch[1].replace(/<br\s*\/?>/g, '\n');
    answers.push(stripInlineTags(withBreaks));
  }

  const faqs = questions.map((question, idx) => ({question, answer: answers[idx] || ''}));

  return {heading, faqs};
}
