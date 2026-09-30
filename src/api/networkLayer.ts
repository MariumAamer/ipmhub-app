/* eslint-disable prettier/prettier */
// Global network layer — installed once from index.js, before anything else
// imports a screen. Every API helper in this app calls the global `fetch`
// directly (there are ~40 separate call sites across api/ and screens/), so
// wrapping it here speeds up EVERY screen at once instead of patching each
// file:
//
//  1. Timeouts. React Native's fetch never times out, so a stalled connection
//     leaves a screen's spinner up forever. GETs/JSON calls abort after 30s,
//     uploads (FormData) after 2 minutes. Callers that pass their own
//     AbortSignal keep full control.
//  2. In-flight de-duplication. When several components ask for the same GET
//     at the same moment (e.g. every tab's header asking for the profile and
//     unread counts), only one request goes out and everyone shares the
//     result.
//  3. A short-lived GET cache. Going back to a screen, switching tabs, or
//     re-focusing a screen re-requests the same URLs; within the TTL those
//     are answered instantly from memory. ANY non-GET request (like, post,
//     comment, enrol, mark-complete, ...) clears the whole cache, so data the
//     user just changed is never served stale.
//
// Only requests to the IPM site's API are touched; everything else (Giphy,
// country lists, etc.) passes straight through.

const API_HOST = 'hub.instituteprojectmanagement.com';

const DEFAULT_TTL_MS = 15 * 1000;
// Public catalogue listings change rarely and aren't user-specific.
const LONG_TTL_MS = 2 * 60 * 1000;
const LONG_TTL_PATHS = [
  '/custom/v1/courses/upcoming',
  '/custom/v1/courses/search',
  '/wp/v2/topic-tag',
];

const MAX_ENTRIES = 80;
const MAX_BODY_CHARS = 600 * 1024;

const GET_TIMEOUT_MS = 30 * 1000;
const UPLOAD_TIMEOUT_MS = 120 * 1000;

type CacheEntry = {
  body: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  expires: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Response>>();

const originalFetch: typeof fetch = globalThis.fetch.bind(globalThis);

const headerValue = (headers: any, name: string): string => {
  if (!headers) return '';
  try {
    if (typeof headers.get === 'function') return headers.get(name) || '';
    const lower = name.toLowerCase();
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === lower) return String(headers[k] ?? '');
    }
  } catch {}
  return '';
};

const ttlFor = (url: string): number =>
  LONG_TTL_PATHS.some(p => url.includes(p)) ? LONG_TTL_MS : DEFAULT_TTL_MS;

const toUrl = (input: any): string =>
  typeof input === 'string' ? input : input?.url ?? String(input);

const buildResponse = (e: CacheEntry): Response =>
  new Response(e.body, {
    status: e.status,
    statusText: e.statusText,
    headers: e.headers,
  });

const withTimeout = async (
  input: any,
  init: RequestInit | undefined,
  ms: number,
): Promise<Response> => {
  // Respect a caller-supplied signal — they own cancellation.
  if (init?.signal) return originalFetch(input, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await originalFetch(input, {...init, signal: controller.signal});
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

const patchedFetch = async (input: any, init?: RequestInit): Promise<Response> => {
  const url = toUrl(input);
  if (!url.includes(API_HOST)) return originalFetch(input, init);

  const method = (init?.method || (typeof input === 'object' && input?.method) || 'GET')
    .toString()
    .toUpperCase();

  // Mutations: pass through (with a timeout) and drop every cached GET.
  if (method !== 'GET') {
    cache.clear();
    const isUpload =
      typeof FormData !== 'undefined' && init?.body instanceof FormData;
    return withTimeout(input, init, isUpload ? UPLOAD_TIMEOUT_MS : GET_TIMEOUT_MS);
  }

  // Key on URL + auth so one account's data is never served to another.
  const key = `${url}|${headerValue(init?.headers, 'Authorization')}`;

  const hit = cache.get(key);
  if (hit) {
    if (hit.expires > Date.now()) return buildResponse(hit);
    cache.delete(key);
  }

  const pending = inflight.get(key);
  if (pending) return (await pending).clone();

  const request = (async () => {
    const res = await withTimeout(input, init, GET_TIMEOUT_MS);
    if (res.status === 200) {
      try {
        const body = await res.clone().text();
        if (body.length <= MAX_BODY_CHARS) {
          const headers: Record<string, string> = {};
          res.headers.forEach((v: string, k: string) => {
            headers[k] = v;
          });
          if (cache.size >= MAX_ENTRIES) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
          }
          cache.set(key, {
            body,
            status: res.status,
            statusText: res.statusText,
            headers,
            expires: Date.now() + ttlFor(url),
          });
        }
      } catch {
        // Caching is best-effort; the live response below is still returned.
      }
    }
    return res;
  })();

  inflight.set(key, request);
  try {
    return (await request).clone();
  } finally {
    inflight.delete(key);
  }
};

// Clears everything — call on logout so nothing survives a sign-out.
export const clearNetworkCache = (): void => {
  cache.clear();
  inflight.clear();
};

(globalThis as any).fetch = patchedFetch;
