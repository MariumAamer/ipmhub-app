/* eslint-disable prettier/prettier */
import {getToken} from './feedApi';
import {registerSessionReset} from './sessionReset';
import {cleanTitle} from './supportHubApi';

// GET /wp-json/custom/v1/mentors/page (confirmed via Postman, Oct 2026).
// Response: { faq: { mentors: {title, description, items: [{title, description(HTML)}]},
//                    mentees: { ...same } }, become_a_mentor: {...}, ... }
// Items have no id, so one is synthesised from group + index. `description` is
// raw WordPress HTML (<p>, <ul><li>, entities, data-* attrs) — it's rendered
// through parseFaqHtml from supportHubApi, which strips tags and decodes
// entities.
const BASE = 'https://hub.instituteprojectmanagement.com/wp-json/custom/v1';

export type MentorshipFaqGroup = 'mentors' | 'mentees';

export interface MentorshipFaq {
  id: string;
  group: MentorshipFaqGroup;
  title: string;
  html: string;
  // Plain-text version of the answer, used only for keyword search.
  text: string;
}

let faqCache: MentorshipFaq[] | null = null;
registerSessionReset(() => {
  faqCache = null;
});

const mapGroup = (group: MentorshipFaqGroup, items: any): MentorshipFaq[] =>
  (Array.isArray(items) ? items : [])
    .map((it: any, i: number) => ({
      id: `${group}-${i}`,
      group,
      title: cleanTitle(it?.title || ''),
      html: it?.description || '',
      text: cleanTitle(it?.description || ''),
    }))
    .filter((f: MentorshipFaq) => !!f.title);

// Mentees first (the screen is opened from the mentor directory), then mentors.
// Returns null on failure so the screen can show a retry state.
export const getMentorshipFaqs = async (force = false): Promise<MentorshipFaq[] | null> => {
  if (faqCache && !force) return faqCache;
  try {
    const token = await getToken();
    const res = await fetch(`${BASE}/mentors/page`, {
      headers: token ? {Authorization: `Bearer ${token}`} : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    const list = [
      ...mapGroup('mentees', data?.faq?.mentees?.items),
      ...mapGroup('mentors', data?.faq?.mentors?.items),
    ];
    if (!list.length) return null;
    faqCache = list;
    return list;
  } catch (err) {
    console.log('getMentorshipFaqs error:', err);
    return null;
  }
};
