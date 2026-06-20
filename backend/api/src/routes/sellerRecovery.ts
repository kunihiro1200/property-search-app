/**
 * Seller Recovery API Routes
 * 
 * Provides endpoints for recovering soft-deleted sellers
 */
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { EnhancedAutoSyncService } from '../services/EnhancedAutoSyncService';
import { authenticate } from '../middleware/auth';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

/**
 * POST /api/sellers/:sellerNumber/recover
 * 
 * Recover a soft-deleted seller
 * 
 * Requires admin authentication
 * 
 * @param sellerNumber - Seller number to recover (e.g., AA12345)
 * @body recoveredBy - Optional: User who is performing the recovery
 * 
 * @returns RecoveryResult with success status and details
 */
router.post('/:sellerNumber/recover', authenticate, async (req: Request, res: Response) => {
  try {
    const { sellerNumber } = req.params;
    const { recoveredBy } = req.body;

    // Validate seller number format
    if (!sellerNumber || !sellerNumber.match(/^AA\d+$/)) {
      return res.status(400).json({
        error: 'Invalid seller number format. Expected format: AA12345',
      });
    }

    // Get user info from auth token
    const userEmail = (req as any).user?.email || (req as any).employee?.email || 'unknown';
    const recoveryUser = recoveredBy || userEmail;

    console.log(`🔄 Recovery request for ${sellerNumber} by ${recoveryUser}`);

    // Initialize sync service
    const syncService = new EnhancedAutoSyncService(supabaseUrl, supabaseServiceKey);
    await syncService.initialize();

    // Execute recovery
    const result = await syncService.recoverDeletedSeller(sellerNumber, recoveryUser);

    // Log the recovery operation
    if (result.success) {
      console.log(`✅ Recovery successful for ${sellerNumber}`);
      
      // Log to activity logs
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from('activity_logs').insert({
        action: 'seller_recovered',
        details: {
          seller_number: sellerNumber,
          recovered_by: recoveryUser,
          properties_restored: result.details?.propertiesRestored || 0,
        },
        created_at: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        message: `Seller ${sellerNumber} recovered successfully`,
        result,
      });
    } else {
      console.error(`❌ Recovery failed for ${sellerNumber}: ${result.error}`);
      return res.status(400).json({
        success: false,
        message: result.error || 'Recovery failed',
        result,
      });
    }

  } catch (error: any) {
    console.error('❌ Recovery endpoint error:', error);
    return res.status(500).json({
      error: 'Internal server error during recovery',
      message: error.message,
    });
  }
});

/**
 * GET /api/sellers/:sellerNumber/recovery-status
 * 
 * Check if a seller can be recovered
 * 
 * @param sellerNumber - Seller number to check
 * 
 * @returns Status information about recovery eligibility
 */
router.get('/:sellerNumber/recovery-status', authenticate, async (req: Request, res: Response) => {
  try {
    const { sellerNumber } = req.params;

    // Validate seller number format
    if (!sellerNumber || !sellerNumber.match(/^AA\d+$/)) {
      return res.status(400).json({
        error: 'Invalid seller number format. Expected format: AA12345',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check deletion audit log
    const { data: auditLog, error } = await supabase
      .from('seller_deletion_audit')
      .select('*')
      .eq('seller_number', sellerNumber)
      .is('recovered_at', null)
      .order('deleted_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !auditLog) {
      return res.status(404).json({
        canRecover: false,
        message: 'Seller not found in deletion audit log',
      });
    }

    return res.status(200).json({
      canRecover: auditLog.can_recover,
      sellerNumber: auditLog.seller_number,
      deletedAt: auditLog.deleted_at,
      deletedBy: auditLog.deleted_by,
      reason: auditLog.reason,
      message: auditLog.can_recover 
        ? 'Seller can be recovered' 
        : 'Recovery is not allowed for this seller',
    });

  } catch (error: any) {
    console.error('❌ Recovery status endpoint error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
