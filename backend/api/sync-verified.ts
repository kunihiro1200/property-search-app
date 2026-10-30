/**
 * Dedicated Vercel Function for GitHub/Railway scheduled property sync.
 *
 * Isolated from backend/api/index.ts so only the scheduled full-list operation
 * can use the longer maxDuration configured in vercel.json. The public browsing
 * API and legacy GAS sync route retain their existing duration and behavior.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createVerifiedPropertySyncHandler } from './src/routes/verifiedPropertySync';

const verifiedHandler = createVerifiedPropertySyncHandler({
  getMachineSecret: () => process.env.CRON_SECRET,
  runSync: async () => {
    const startedAt = Date.now();
    const { getPropertyListingSyncService } = await import('./src/services/PropertyListingSyncService');
    const syncService = getPropertyListingSyncService();
    await syncService.initializeForScheduledSync();
    console.log('[Sync Verified] Property sheet auth durationMs=', Date.now() - startedAt);
    return await syncService.runScheduledSync();
  },
});

export default async function scheduledSync(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'POST');

  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  // VercelRequest/VercelResponse expose exactly the header/status/json/end
  // APIs used by this Express RequestHandler; no Express app is bootstrapped.
  await verifiedHandler(req as any, res as any, () => {
    console.error('[Sync Verified] Unexpected middleware handoff');
    if (!res.headersSent) res.status(500).end();
  });
}
