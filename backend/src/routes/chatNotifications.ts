import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { chatNotificationService } from '../services/ChatNotificationService';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Send general contract notification
 * POST /chat-notifications/general-contract/:sellerId
 */
router.post(
  '/general-contract/:sellerId',
  [
    param('sellerId').isUUID().withMessage('Invalid seller ID'),
    body('assignee').optional().isString(),
    body('notes').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { sellerId } = req.params;
      const success = await chatNotificationService.sendGeneralContractNotification(
        sellerId,
        req.body
      );

      res.json({ success });
    } catch (error: any) {
      console.error('Send general contract notification error:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATION_ERROR',
          message: error.message || 'Failed to send notification',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Send exclusive contract notification
 * POST /chat-notifications/exclusive-contract/:sellerId
 */
router.post(
  '/exclusive-contract/:sellerId',
  [
    param('sellerId').isUUID().withMessage('Invalid seller ID'),
    body('assignee').optional().isString(),
    body('notes').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { sellerId } = req.params;
      const success = await chatNotificationService.sendExclusiveContractNotification(
        sellerId,
        req.body
      );

      res.json({ success });
    } catch (error: any) {
      console.error('Send exclusive contract notification error:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATION_ERROR',
          message: error.message || 'Failed to send notification',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Send post-visit other decision notification
 * POST /chat-notifications/post-visit-other-decision/:sellerId
 */
router.post(
  '/post-visit-other-decision/:sellerId',
  [
    param('sellerId').isUUID().withMessage('Invalid seller ID'),
    body('reason').optional().isString(),
    body('notes').optional().isString(),
    body('assignee').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { sellerId } = req.params;
      const success = await chatNotificationService.sendPostVisitOtherDecisionNotification(
        sellerId,
        req.body
      );

      res.json({ success });
    } catch (error: any) {
      console.error('Send post-visit other decision notification error:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATION_ERROR',
          message: error.message || 'Failed to send notification',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Send pre-visit other decision notification
 * POST /chat-notifications/pre-visit-other-decision/:sellerId
 */
router.post(
  '/pre-visit-other-decision/:sellerId',
  [
    param('sellerId').isUUID().withMessage('Invalid seller ID'),
    body('reason').optional().isString(),
    body('notes').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { sellerId } = req.params;
      const success = await chatNotificationService.sendPreVisitOtherDecisionNotification(
        sellerId,
        req.body
      );

      res.json({ success });
    } catch (error: any) {
      console.error('Send pre-visit other decision notification error:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATION_ERROR',
          message: error.message || 'Failed to send notification',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Send property introduction notification
 * POST /chat-notifications/property-introduction/:sellerId
 */
router.post(
  '/property-introduction/:sellerId',
  [
    param('sellerId').isUUID().withMessage('Invalid seller ID'),
    body('introduction').notEmpty().withMessage('Introduction text is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { sellerId } = req.params;
      const { introduction } = req.body;
      const success = await chatNotificationService.sendPropertyIntroductionNotification(
        sellerId,
        introduction
      );

      res.json({ success });
    } catch (error: any) {
      console.error('Send property introduction notification error:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATION_ERROR',
          message: error.message || 'Failed to send notification',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Check if Google Chat is configured
 * GET /chat-notifications/status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const configured = chatNotificationService.isConfigured();
    res.json({ configured });
  } catch (error: any) {
    console.error('Check chat notification status error:', error);
    res.status(500).json({
      error: {
        code: 'STATUS_ERROR',
        message: error.message || 'Failed to check status',
        retryable: true,
      },
    });
  }
});

/**
 * Send custom message to property assignee's chat
 * POST /chat-notifications/property-assignee/:propertyNumber
 */
router.post(
  '/property-assignee/:propertyNumber',
  [
    param('propertyNumber').notEmpty().withMessage('Property number is required'),
    body('message').notEmpty().withMessage('Message is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { propertyNumber } = req.params;
      const { message } = req.body;
      
      // StaffManagementServiceを使用して担当者のWebhook URLを取得
      const { StaffManagementService } = await import('../services/StaffManagementService');
      const { PropertyListingService } = await import('../services/PropertyListingService');
      
      const staffService = new StaffManagementService();
      const propertyService = new PropertyListingService();
      
      // 物件情報を取得
      const property = await propertyService.getByPropertyNumber(propertyNumber);
      
      if (!property) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
            retryable: false,
          },
        });
      }
      
      if (!property.sales_assignee) {
        return res.status(400).json({
          error: {
            code: 'NO_ASSIGNEE',
            message: '物件に担当者が設定されていません',
            retryable: false,
          },
        });
      }
      
      // 担当者のWebhook URLを取得
      const result = await staffService.getWebhookUrl(property.sales_assignee);
      
      if (!result.success || !result.webhookUrl) {
        return res.status(400).json({
          error: {
            code: 'NO_WEBHOOK',
            message: result.error || '担当者のチャットWebhook URLが見つかりません',
            retryable: false,
          },
        });
      }
      
      // チャットにメッセージを送信
      const axios = (await import('axios')).default;
      const response = await axios.post(result.webhookUrl, {
        text: `🏠 *物件番号: ${propertyNumber}*\n\n${message}`,
      });
      
      const success = response.status === 200;
      
      console.log('[chat-notification] Sent message to property assignee:', {
        propertyNumber,
        assignee: property.sales_assignee,
        success,
      });
      
      res.json({ 
        success,
        assignee: property.sales_assignee,
      });
    } catch (error: any) {
      console.error('Send property assignee notification error:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATION_ERROR',
          message: error.message || 'Failed to send notification',
          retryable: true,
        },
      });
    }
  }
);

/**
 * Schedule price reduction notification
 * POST /chat-notifications/schedule-price-reduction/:propertyNumber
 */
router.post(
  '/schedule-price-reduction/:propertyNumber',
  [
    param('propertyNumber').notEmpty().withMessage('Property number is required'),
    body('scheduledDate').notEmpty().withMessage('Scheduled date is required'),
    body('message').notEmpty().withMessage('Message is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { propertyNumber } = req.params;
      const { scheduledDate, message } = req.body;
      
      // StaffManagementServiceを使用して担当者のWebhook URLを取得
      const { StaffManagementService } = await import('../services/StaffManagementService');
      const { PropertyListingService } = await import('../services/PropertyListingService');
      
      const staffService = new StaffManagementService();
      const propertyService = new PropertyListingService();
      
      // 物件情報を取得
      const property = await propertyService.getByPropertyNumber(propertyNumber);
      
      if (!property) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
            retryable: false,
          },
        });
      }
      
      if (!property.sales_assignee) {
        return res.status(400).json({
          error: {
            code: 'NO_ASSIGNEE',
            message: '物件に担当者が設定されていません',
            retryable: false,
          },
        });
      }
      
      // 担当者のWebhook URLを取得
      const result = await staffService.getWebhookUrl(property.sales_assignee);
      
      if (!result.success || !result.webhookUrl) {
        return res.status(400).json({
          error: {
            code: 'NO_WEBHOOK',
            message: result.error || '担当者のチャットWebhook URLが見つかりません',
            retryable: false,
          },
        });
      }
      
      // 東京時間の9:00に送信するようにスケジュール
      // scheduledDateは "YYYY-MM-DD" 形式
      const scheduledDateTime = new Date(`${scheduledDate}T09:00:00+09:00`);
      
      // 現在時刻より前の日付はエラー
      if (scheduledDateTime <= new Date()) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE',
            message: '過去の日付は指定できません',
            retryable: false,
          },
        });
      }
      
      // Supabaseに予約情報を保存
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: scheduledNotification, error: insertError } = await supabase
        .from('scheduled_notifications')
        .insert({
          property_number: propertyNumber,
          assignee: property.sales_assignee,
          webhook_url: result.webhookUrl,
          message: `🏠 *物件番号: ${propertyNumber}*\n📅 *予約値下げ通知*\n\n${message}`,
          scheduled_at: scheduledDateTime.toISOString(),
          status: 'pending',
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[schedule-price-reduction] Failed to insert scheduled notification:', insertError);
        return res.status(500).json({
          error: {
            code: 'DATABASE_ERROR',
            message: '予約値下げの保存に失敗しました',
            retryable: true,
          },
        });
      }
      
      console.log('[schedule-price-reduction] Scheduled notification:', {
        id: scheduledNotification.id,
        propertyNumber,
        assignee: property.sales_assignee,
        scheduledAt: scheduledDateTime.toISOString(),
      });
      
      res.json({ 
        success: true,
        scheduledAt: scheduledDateTime.toISOString(),
        assignee: property.sales_assignee,
      });
    } catch (error: any) {
      console.error('Schedule price reduction error:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATION_ERROR',
          message: error.message || 'Failed to schedule notification',
          retryable: true,
        },
      });
    }
  }
);

export default router;
