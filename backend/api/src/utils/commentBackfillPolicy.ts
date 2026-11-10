/**
 * Private, bounded comment-backfill controls.
 *
 * The public property detail POST remains unchanged during this migration.
 * The new internal route is staff/machine authenticated, previews by default,
 * and requires a second, server-side opt-in before any backfill write.
 */

export interface CommentBackfillOptions {
  mode: 'preview' | 'execute';
  limit: number;
  after: string | null;
  /** Required for execution; prevents running through the entire inventory. */
  propertyNumbers: string[] | null;
}

export const PUBLIC_COMMENT_BACKFILL_STATUSES = [
  '専任・公開中',
  '一般・公開中',
  '公開中',
];

export function parseCommentBackfillOptions(value: unknown): CommentBackfillOptions | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const limit = input.limit === undefined ? 2 : input.limit;
  const after = input.after === undefined || input.after === null ? null : input.after;
  const selected = input.propertyNumbers === undefined || input.propertyNumbers === null
    ? null
    : input.propertyNumbers;

  // A single serverless invocation must never attempt a broad Sheet sync.
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 2) return null;
  if (after !== null && (typeof after !== 'string' || !/^[a-zA-Z0-9_-]{1,48}$/.test(after))) return null;
  if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') return null;
  if (input.execute !== undefined && typeof input.execute !== 'boolean') return null;

  if (selected !== null) {
    if (!Array.isArray(selected) || selected.length < 1 || selected.length > limit) return null;
    if (!selected.every((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(id))) return null;
    if (new Set(selected).size !== selected.length) return null;
    if (after !== null) return null;
  }

  const mode = input.execute === true && input.dryRun === false ? 'execute' : 'preview';

  // An explicit server opt-in is necessary, but NOT sufficient for writes.
  // Staff must also select one or two exact public property numbers.
  if (mode === 'execute' && selected === null) return null;

  return {
    mode,
    limit,
    after: typeof after === 'string' ? after : null,
    propertyNumbers: selected as string[] | null,
  };
}

/** Server-only kill switch, default OFF for backward-compatible public pages. */
export function isAnonymousCommentSyncDisabled(flag: string | undefined): boolean {
  return flag === 'true';
}

/** Work-task source URL must be a valid Google spreadsheet, not arbitrary user text. */
export function isTrustedCommentSourceLink(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' ||
        url.username || url.password || url.port) return false;
    return /^\/spreadsheets\/d\/[A-Za-z0-9_-]{10,}(?:\/|$)/.test(url.pathname);
  } catch {
    return false;
  }
}

/**
 * Return only the individual Sheet ID from a previously validated internal
 * work_tasks URL. Never accept a URL from the anonymous request body.
 */
export function extractTrustedCommentSpreadsheetId(value: unknown): string | null {
  if (!isTrustedCommentSourceLink(value)) return null;
  try {
    const parsed = new URL(String(value).trim());
    const match = /^\/spreadsheets\/d\/([A-Za-z0-9_-]{10,})(?:\/|$)/.exec(parsed.pathname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isCommentBackfillWriteEnabled(flag: string | undefined): boolean {
  return flag === 'true';
}

export function propertyNeedsCommentBackfill(details: {
  favorite_comment?: unknown;
  recommended_comments?: unknown;
} | null | undefined): boolean {
  if (!details) return true;
  // Internal, authenticated backfill can be explicitly requested for a
  // missing favorite phrase. Public visitor-triggered sync is deliberately
  // narrower: it should not loop forever on intentionally blank favorites.
  return !details.favorite_comment ||
    !details.recommended_comments ||
    (Array.isArray(details.recommended_comments) && details.recommended_comments.length === 0);
}
