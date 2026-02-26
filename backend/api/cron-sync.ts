import { VercelRequest, VercelResponse } from '@vercel/node';
import { EnhancedAutoSyncService } from '../src/services/EnhancedAutoSyncService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cron認証チェック
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Cron job triggered at', new Date().toISOString());
    
    const syncService = new EnhancedAutoSyncService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await syncService.initialize();
    const result = await syncService.runFullSync('scheduled');
    
    console.log('✅ Cron job completed:', result);
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        status: result.status,
        sellersAdded: result.additionResult.successfullyAdded,
        sellersUpdated: result.additionResult.successfullyUpdated,
        sellersDeleted: result.deletionResult.successfullyDeleted,
        durationMs: result.totalDurationMs,
      },
    });
  } catch (error: any) {
    console.error('❌ Cron job failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
