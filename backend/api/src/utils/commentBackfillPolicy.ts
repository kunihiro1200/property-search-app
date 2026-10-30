/**
 * Private, bounded comment-backfill controls.
 *
 * The public property detail POST remains unchanged during this migration.
 * The new internal route is staff/machine authenticated, previews by default,
 * and requires a second, server-side opt-in before any backfill write.
 */
import { needsPublicCommentSync } from './publicCommentSyncGuard';

export interface CommentBackfillOptions {
  mode: 'preview' | 'execute';
  limit: number;
  after: string | null;
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

  // A single serverless invocation must never attempt a broad Sheet sync.
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 2) return null;
  if (after !== null && (typeof after !== 'string' || !/^[a-zA-Z0-9_-]{1,48}$/.test(after))) return null;
  if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') return null;
  if (input.execute !== undefined && typeof input.execute !== 'boolean') return null;

  // Never execute due to a missing, truthy, or ambiguous flag.
  return {
    mode: input.execute === true && input.dryRun === false ? 'execute' : 'preview',
    limit,
    after: typeof after === 'string' ? after : null,
  };
}

export function isCommentBackfillWriteEnabled(flag: string | undefined): boolean {
  return flag === 'true';
}

export function propertyNeedsCommentBackfill(details: {
  favorite_comment?: unknown;
  recommended_comments?: unknown;
} | null | undefined): boolean {
  if (!details) return true;
  return needsPublicCommentSync(details.favorite_comment, details.recommended_comments);
}
