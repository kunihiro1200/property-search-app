/**
 * Safe, side-effect-free argument and URL inspection for bounded coordinate
 * backfill. The server must separately authenticate callers and enforce
 * PROPERTY_COORDINATE_BACKFILL_ENABLED before any database write.
 */
import { parseTrustedGoogleMapCoordinates } from './trustedPropertyCoordinates';

export type BackfillBatchMode = 'preview' | 'execute';
export type StoredMapUrlKind = 'direct_coordinates' | 'google_shortlink' | 'unsupported';

export interface BackfillBatchOptions {
  mode: BackfillBatchMode;
  limit: number;
  after: string | null;
}

export function parseBackfillBatchOptions(value: unknown): BackfillBatchOptions | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const limit = body.limit === undefined ? 5 : body.limit;
  const after = body.after === undefined || body.after === null ? null : body.after;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 5) return null;
  if (after !== null && (typeof after !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(after))) return null;
  if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') return null;
  if (body.execute !== undefined && typeof body.execute !== 'boolean') return null;

  // Writes require two explicit acknowledgements, never just "dryRun:false".
  const mode: BackfillBatchMode = body.execute === true && body.dryRun === false
    ? 'execute'
    : 'preview';
  return { mode, limit: Number(limit), after };
}

export function isCoordinateBackfillWriteEnabled(flag: string | undefined): boolean {
  return flag === 'true';
}

export function classifyStoredMapUrl(value: string | null | undefined): StoredMapUrlKind {
  if (parseTrustedGoogleMapCoordinates(value)) return 'direct_coordinates';

  try {
    if (!value || value.length > 2048) return 'unsupported';
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return 'unsupported';
    if (url.hostname === 'maps.app.goo.gl' ||
      (url.hostname === 'goo.gl' && (url.pathname === '/maps' || url.pathname.startsWith('/maps/')))) {
      return 'google_shortlink';
    }
  } catch {
    return 'unsupported';
  }
  return 'unsupported';
}
