/* eslint-disable prettier/prettier */
/**
 * pdusApi.ts — PDU / CPD Tracker API
 *
 * All 5 endpoints below were confirmed via Postman (Aug 2026):
 *   GET    /wp-json/custom/v1/about-pdus              — banner/intro copy for the About PDUs page
 *   GET    /wp-json/custom/v1/my-pdus?user_id={id}    — summary + activity_types + filters + records[]
 *   POST   /wp-json/custom/v1/my-pdus/records          — create a record (multipart, optional file)
 *   POST   /wp-json/custom/v1/my-pdus/records/{id}     — update a record (multipart, optional file)
 *   DELETE /wp-json/custom/v1/my-pdus/records/{id}     — delete a record
 *
 * CONFIRMED field shape (from live Postman responses):
 *   - start_date/end_date are "DD-MM" strings, start_year/end_year are
 *     separate "YYYY" strings — NOT a single date field. The Add/Edit form
 *     must submit these as 4 separate fields to match.
 *   - hours is numeric; hours_label is a pre-formatted "{n} hours" string
 *     for display — use hours_label for the card, hours (number) for the
 *     edit form's initial value.
 *   - file_url/file_kind are per-record; can_edit gates whether the
 *     edit/delete icons should show (auto/course-added records have
 *     can_edit:false and no edit/delete affordance).
 *   - activity_types (id/label pairs) and filters.activity_types /
 *     filters.start_years are backend-driven — NOT static lists. The
 *     filter dropdowns should only ever show values actually present in
 *     filters, not activity_types (activity_types is the full picklist
 *     for the Add/Edit form's "Select Activity Type" screen; filters is
 *     the narrower "what actually exists in this user's records" list).
 *   - create/update responses both include a fresh `summary` block —
 *     use it to refresh the header numbers (hours_earned/hours_remaining/
 *     percentage) after a save without a second GET round-trip.
 *
 * ⚠️ UNCONFIRMED: the multipart field name for the uploaded file. Every
 * Postman test so far omitted the file. Modeled here as `file` to match
 * the same convention used elsewhere in this codebase (forumsApi.ts,
 * profileApi.ts, mentorApplicationApi.ts all use `file`/`cv` as the
 * FormData key). CONFIRM with Robby / a real Postman file-upload test
 * before relying on this in production — if the key is wrong the file
 * will likely just be silently dropped server-side.
 *
 * ⚠️ Also unconfirmed: whether omitting `file` on an UPDATE preserves an
 * existing attachment or clears it. The one live update test we have
 * (id 87) had no prior file to begin with, so this wasn't actually
 * exercised. Until confirmed, treat "editing a record with an existing
 * file, without re-picking a new file" as a real risk of wiping the
 * attachment — flag this to Robby.
 *
 * ⚠️ The "PDUs Tracker – IPMA Version" mockup (donut chart + CPD
 * Requirements / recertification deadline block) is NOT implemented here.
 * summary.type is confirmed to come back as "NON-IPMA" for the current
 * test user, with summary.ipma: null — the IPMA variant is presumably
 * summary.type: "IPMA" with summary.ipma populated instead. Scope/trigger
 * for that variant hasn't been confirmed yet, so PDUsTrackerScreen below
 * only renders the NON-IPMA header. Revisit once that's clarified.
 */
import {getToken} from './apiClient';

const BASE = 'https://hub.instituteprojectmanagement.com/wp-json/custom/v1';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AboutPdusResponse {
  page: {id: number; title: string; url: string};
  tabs: Array<{
    id: string; label: string; page_slug: string; rest_route: string;
    url: string; available: boolean; endpoint: string; endpoint_path: string;
  }>;
  content_html: string;
  sections: Array<{
    id: string; anchor: string; heading: string; content_html: string;
    accordions: Array<{title: string; content_html: string}>;
  }>;
  table_of_contents: Array<{id: string; label: string; anchor: string}>;
  sidebar: Record<string, {title: string; items: Array<{title: string; url: string}>}>;
  share: Record<string, string>;
}

export interface PduActivityType {
  id: string;
  label: string;
}

export interface PduRecord {
  id: number;
  number: number;
  activity_type: string;
  activity_name: string;
  start_date: string;   // "DD-MM"
  start_year: string;   // "YYYY"
  end_date: string;     // "DD-MM"
  end_year: string;     // "YYYY"
  hours: number;
  hours_label: string;  // e.g. "5 hours"
  description: string;
  file_url: string;
  file_kind: string;    // e.g. "image" | "" — presumably also "pdf"/"doc" etc
  record_type: 'manual' | 'auto' | string;
  can_edit: boolean;
}

export interface PduSummary {
  type: 'NON-IPMA' | 'IPMA' | string;
  title: string;
  intro: string;
  hours_earned: number;
  hours_required: number;
  hours_remaining: number;
  percentage: number;
  recertification_deadline: string;
  records_heading: string;
  records_help: string;
  add_record_label: string;
  ipma: null | Record<string, any>;
}

export interface MyPdusResponse {
  page: {id: number; title: string; url: string};
  tabs: AboutPdusResponse['tabs'];
  summary: PduSummary;
  activity_types: PduActivityType[];
  filters: {
    activity_types: string[];
    start_years: string[];
  };
  records: PduRecord[];
  total: number;
}

export interface SaveRecordResponse {
  message: string;
  record: PduRecord;
  summary: PduSummary;
}

export interface DeleteRecordResponse {
  message: string;
  summary: PduSummary;
}

// Fields the Add/Edit form collects — matches the confirmed record shape
// 1:1 (separate day-month + year fields, not one combined date).
export interface CpdRecordInput {
  activity_type: string;
  activity_name: string;
  start_date: string;  // "DD-MM"
  start_year: string;  // "YYYY"
  end_date: string;    // "DD-MM"
  end_year: string;    // "YYYY"
  hours: string;
  description: string;
  // Local file picker result — omit to leave the file field out of the
  // request entirely (e.g. editing an entry without touching the file).
  file?: {uri: string; name: string; type: string} | null;
}

// ─── Requests ───────────────────────────────────────────────────────────────

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  return token ? {Authorization: `Bearer ${token}`} : {};
};

export const getAboutPdus = async (): Promise<AboutPdusResponse> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/about-pdus`, {headers});
  if (!res.ok) throw new Error(`Failed to load About PDUs (${res.status})`);
  return res.json();
};

export const getMyPdus = async (userId: number): Promise<MyPdusResponse> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/my-pdus?user_id=${userId}`, {headers});
  if (!res.ok) throw new Error(`Failed to load My PDUs (${res.status})`);
  return res.json();
};

// Shared by create + update — same field set, same multipart shape.
const buildRecordFormData = (input: CpdRecordInput): FormData => {
  const fd = new FormData();
  fd.append('activity_type', input.activity_type);
  fd.append('activity_name', input.activity_name);
  fd.append('start_date', input.start_date);
  fd.append('start_year', input.start_year);
  fd.append('end_date', input.end_date);
  fd.append('end_year', input.end_year);
  fd.append('hours', input.hours);
  fd.append('description', input.description);
  if (input.file) {
    fd.append('file', {
      uri: input.file.uri,
      type: input.file.type || 'application/octet-stream',
      name: input.file.name || 'attachment',
    } as any);
  }
  return fd;
};

export const createPduRecord = async (
  input: CpdRecordInput,
): Promise<SaveRecordResponse> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/my-pdus/records`, {
    method: 'POST',
    headers, // do NOT set Content-Type — fetch sets the multipart boundary itself
    body: buildRecordFormData(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.message) || `Failed to save record (${res.status})`);
  }
  return data;
};

export const updatePduRecord = async (
  id: number,
  input: CpdRecordInput,
): Promise<SaveRecordResponse> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/my-pdus/records/${id}`, {
    method: 'POST', // confirmed via Postman — update uses POST, not PUT/PATCH
    headers,
    body: buildRecordFormData(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.message) || `Failed to update record (${res.status})`);
  }
  return data;
};

export const deletePduRecord = async (id: number): Promise<DeleteRecordResponse> => {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/my-pdus/records/${id}`, {
    method: 'DELETE',
    headers,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.message) || `Failed to delete record (${res.status})`);
  }
  return data;
};
