/* eslint-disable prettier/prettier */
/**
 * reportApi — BuddyBoss moderation: report a post, comment, forum discussion /
 * reply, or a member.
 *
 *   GET  /buddyboss/v1/moderation/report  → the report form: field
 *        `report_category` (radio) with options {value:"28", name:"Fraud or
 *        scam", description}, plus an "Other" option (value "other").
 *   POST /buddyboss/v1/moderation/report  → {item_id, item_type,
 *        report_category: "<reason id>" | "other", note?}
 *        item_type: activity | activity_comment | forum_topic | forum_reply |
 *        user_report (item_id = the member's user id) |
 *        comment (item_id = a WordPress comment id — confirmed by backend for
 *        both intro comments and lesson/step comments; no new endpoint needed)
 *
 * The screens keep their own reason wording (Figma). Reason IDs are site data,
 * so each label is matched to the server's reason by name; a label with no
 * match is sent as "other" with the label as the note. The server takes ONE
 * category per report, so extra selected labels go into the note.
 */
import {AccountApiError, bbRequest} from './accountApi';

export type ReportItemType =
  | 'activity'
  | 'activity_comment'
  | 'forum_topic'
  | 'forum_reply'
  | 'user_report'
  /** WordPress comment (intro comments, lesson / step comments). Confirmed by backend. */
  | 'comment';

export interface ReportReason {
  id: string;
  name: string;
  description: string;
}

let reasonCache: ReportReason[] | null = null;

export const getReportReasons = async (): Promise<ReportReason[]> => {
  if (reasonCache) return reasonCache;
  const form = await bbRequest('/moderation/report');
  const field = Array.isArray(form)
    ? form.find((f: any) => f?.name === 'report_category')
    : null;
  const list: ReportReason[] = (field?.options || [])
    .filter((o: any) => o?.value)
    .map((o: any) => ({
      id: String(o.value),
      name: o.name || '',
      description: o.description || '',
    }));
  if (!list.length) {
    throw new AccountApiError('Report reasons are unavailable.', 'no_reasons');
  }
  reasonCache = list;
  return list;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

const post = (body: Record<string, unknown>) =>
  bbRequest('/moderation/report', 'POST', body);

/** Submit a report. Throws AccountApiError (server message in .message). */
export const submitReport = async (
  itemType: ReportItemType,
  itemId: number,
  labels: string[],
  /** Free text the member typed for "Other". Always goes into the note. */
  userNote = '',
): Promise<void> => {
  let reasons: ReportReason[] = [];
  try {
    reasons = await getReportReasons();
  } catch {
    // Reasons list unavailable — still file the report as "other" below.
  }

  const primary = labels[0] || '';
  const match = reasons.find(
    r => r.id !== 'other' && norm(r.name) === norm(primary),
  );
  const labelNote = labels.length > 1 || !match ? labels.join(', ') : '';
  const note = [labelNote, userNote.trim()].filter(Boolean).join(' - ');

  const send = (category: string, withNote: string) =>
    post({
      item_id: itemId,
      item_type: itemType,
      report_category: category,
      ...(withNote ? {note: withNote} : {}),
    });

  try {
    await send(match ? match.id : 'other', note || (match ? '' : primary));
  } catch (e: any) {
    // The server may only accept "other" for some item types (e.g. members).
    // Retry once that way so the report is not lost; the label rides in the note.
    // Not for "already reported" (400 bp_rest_moderation_already_reported):
    // retrying can't change that answer, so show the server's message as is.
    if (
      match &&
      e instanceof AccountApiError &&
      e.status === 400 &&
      e.code !== 'bp_rest_moderation_already_reported'
    ) {
      await send(
        'other',
        [labels.join(', '), userNote.trim()].filter(Boolean).join(' - '),
      );
      return;
    }
    throw e;
  }
};
