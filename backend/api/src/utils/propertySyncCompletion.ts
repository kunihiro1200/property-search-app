/**
 * Pure validation of a scheduled-sync result.
 * Used by the authenticated completion endpoint; it must never return success
 * for an empty spreadsheet, a partial failure, or missing/invalid counts.
 *
 * This module has no network, file-system, Supabase or Google credentials.
 */
export interface VerifiedSyncResult {
  success: boolean;
  successfullyUpdated: number;
  failed: number;
  errors: Array<unknown>;
}

export function isVerifiedSyncComplete(result: VerifiedSyncResult): boolean {
  return result.success === true &&
    Number.isSafeInteger(result.successfullyUpdated) &&
    result.successfullyUpdated > 0 &&
    Number.isSafeInteger(result.failed) &&
    result.failed === 0 &&
    Array.isArray(result.errors) &&
    result.errors.length === 0;
}
