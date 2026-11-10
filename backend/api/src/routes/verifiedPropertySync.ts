/**
 * Scheduled property-sync completion endpoint.
 *
 * Its dependencies are injected so that HTTP/auth/completion behavior can be
 * tested without constructing a real Sheets or Supabase client.
 */
import type { RequestHandler } from 'express';
import { isVerifiedSyncComplete, type VerifiedSyncResult } from '../utils/propertySyncCompletion';

export interface ScheduledSyncOutcome extends VerifiedSyncResult {
  successfullyAdded: number;
}

interface VerifiedPropertySyncDeps {
  getMachineSecret: () => string | undefined;
  runSync: () => Promise<ScheduledSyncOutcome>;
}

export function createVerifiedPropertySyncHandler(
  { getMachineSecret, runSync }: VerifiedPropertySyncDeps
): RequestHandler {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    const secret = getMachineSecret();
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).end();
    }

    const startedAt = new Date();
    console.log('[Sync Verified] Authenticated scheduled sync started at', startedAt.toISOString());

    try {
      // Crucial distinction from the legacy GAS endpoint: do not return 200
      // until this exact Promise resolves and its result is validated.
      const result = await runSync();
      const completed = isVerifiedSyncComplete(result);
      const durationMs = Date.now() - startedAt.getTime();

      const summary = {
        success: completed,
        complete: completed,
        successfullyAdded: result.successfullyAdded,
        successfullyUpdated: result.successfullyUpdated,
        failed: result.failed,
        durationMs,
        completedAt: new Date().toISOString(),
      };

      if (!completed) {
        console.error('[Sync Verified] Sync failed or incomplete', {
          added: result.successfullyAdded,
          updated: result.successfullyUpdated,
          failed: result.failed,
          durationMs,
        });
        return res.status(502).json(summary);
      }

      console.log('[Sync Verified] Sync completed successfully', {
        added: result.successfullyAdded,
        updated: result.successfullyUpdated,
        failed: 0,
        durationMs,
      });
      return res.status(200).json(summary);
    } catch (_error) {
      // Suppress source errors and credentials in responses and logs.
      console.error('[Sync Verified] Scheduled sync threw an exception');
      return res.status(500).json({
        success: false,
        complete: false,
        error: 'Scheduled sync did not complete',
      });
    }
  };
}
