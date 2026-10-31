/**
 * Authenticated coordinate backfill planning, capped to public listings.
 * Default: no network, no writes, aggregate-only preview.
 * Execution: 1-2 selected IDs, exact double intent and server-only opt-in.
 */
import { parseTrustedGoogleMapCoordinates } from './trustedPropertyCoordinates';

export const COORDINATE_PUBLIC_STATUSES = ['専任・公開中', '一般・公開中', '公開中'];
export type BackfillMode = 'preview' | 'execute';
export type SourceKind = 'direct_coordinates' | 'google_shortlink' | 'unsupported';

export interface BackfillOptions {
  mode: BackfillMode;
  limit: number;
  after: string | null;
  propertyNumbers: string[] | null;
}
const ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export function parseBackfillOptions(value: unknown): BackfillOptions | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.execute !== undefined && typeof v.execute !== 'boolean') return null;
  if (v.dryRun !== undefined && typeof v.dryRun !== 'boolean') return null;
  const selected = v.propertyNumbers === undefined || v.propertyNumbers === null ? null : v.propertyNumbers;
  if (selected !== null) {
    if (!Array.isArray(selected) || selected.length === 0 || selected.length > 2 ||
        !selected.every(id => typeof id === 'string' && ID_PATTERN.test(id)) ||
        new Set(selected).size !== selected.length) return null;
  }
  const limit = v.limit === undefined ? (selected ? selected.length : 5) : v.limit;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 5) return null;
  const after = v.after === undefined || v.after === null ? null : v.after;
  if (after !== null && (typeof after !== 'string' || !ID_PATTERN.test(after))) return null;
  if (selected !== null && after !== null) return null;
  const mode = v.execute === true && v.dryRun === false ? 'execute' : 'preview';
  if (mode === 'execute' && (!selected || selected.length !== limit)) return null;
  return { mode, limit: Number(limit), after: after as string | null, propertyNumbers: selected as string[] | null };
}

export function isBackfillWriteEnabled(flag: string | undefined): boolean {
  return flag === 'true';
}

export function classifyStoredMapUrl(value: unknown): SourceKind {
  if (typeof value !== 'string') return 'unsupported';
  if (parseTrustedGoogleMapCoordinates(value)) return 'direct_coordinates';
  if (value.length > 2048) return 'unsupported';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search) return 'unsupported';
    if (url.hostname === 'maps.app.goo.gl' && /^\/[A-Za-z0-9_-]{4,100}\/?$/.test(url.pathname)) return 'google_shortlink';
    if (url.hostname === 'goo.gl' && /^\/maps\/[A-Za-z0-9_-]{4,100}\/?$/.test(url.pathname)) return 'google_shortlink';
  } catch { return 'unsupported'; }
  return 'unsupported';
}
