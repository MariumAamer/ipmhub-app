/* eslint-disable prettier/prettier */
/**
 * guidelinesApi — GET /wp-json/custom/v1/community-guidelines
 * Public (no sign-in), so it works from the Sign Up screen.
 * Returns { title, updated_label, html } — html is ready to display.
 */
import {BASE_URL} from './apiClient';

export interface CommunityGuidelines {
  title: string;
  updatedLabel: string;
  html: string;
}

export const getCommunityGuidelines = async (): Promise<CommunityGuidelines> => {
  // RN fetch has no timeout; abort after 20s so the spinner can't hang.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${BASE_URL}/custom/v1/community-guidelines`, {
      headers: {Accept: 'application/json'},
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || typeof data.html !== 'string' || !data.html.trim()) {
      throw new Error('Could not load the Community Guidelines.');
    }
    return {
      title: data.title || 'Community Guidelines',
      updatedLabel: data.updated_label || '',
      html: data.html,
    };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw new Error(e?.message || 'Could not load the Community Guidelines.');
  } finally {
    clearTimeout(timer);
  }
};
