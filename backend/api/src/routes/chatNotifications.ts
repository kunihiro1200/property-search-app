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

export default router;
