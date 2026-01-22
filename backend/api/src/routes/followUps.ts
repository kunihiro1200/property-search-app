import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { FollowUpService } from '../services/FollowUpService.supabase';
import { authenticate } from '../middleware/auth';
import { ActivityType, ConfidenceLevel } from '../types';

const router = Router();
const followUpService = new FollowUpService();

// 全てのルートに認証を適用
router.use(authenticate);

/**
 * 追客活動を記録
 */
router.post(
  '/:sellerId/activities',
  [
    body('type').isIn(Object.values(ActivityType)).withMessage('Invalid activity type'),
    body('content').notEmpty().withMessage('Content is required'),
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
      const { type, content, result, metadata } = req.body;

      const activity = await followUpService.recordActivity({
        sellerId,
        employeeId: req.employee!.id,
        type,
        content,
        result,
        metadata,
      });
      res.status(201).json(activity);
    } catch (error) {
      console.error('Record activity error:', error);
      res.status(500).json({
        error: {
          code: 'RECORD_ACTIVITY_ERROR',
          message: 'Failed to record activity',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 追客履歴を取得
 */
router.get('/:sellerId/activities', async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const activities = await followUpService.getActivityHistory(sellerId);
    res.json(activities);
  } catch (error) {
    console.error('Get activity history error:', error);
    res.status(500).json({
      error: {
        code: 'GET_ACTIVITY_HISTORY_ERROR',
        message: 'Failed to get activity history',
        retryable: true,
      },
    });
  }
});

/**
 * ヒアリング内容を記録
 */
router.post(
  '/:sellerId/hearing',
  [body('content').notEmpty().withMessage('Hearing content is required')],
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
      const { content, metadata } = req.body;

      const activity = await followUpService.recordHearing({
        sellerId,
        employeeId: req.employee!.id,
        content,
        metadata,
      });

      res.status(201).json(activity);
    } catch (error) {
      console.error('Record hearing error:', error);
      res.status(500).json({
        error: {
          code: 'RECORD_HEARING_ERROR',
          message: 'Failed to record hearing',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 次電日を設定
 */
router.put(
  '/:sellerId/next-call-date',
  [body('date').isISO8601().withMessage('Invalid date format')],
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
      const { date } = req.body;

      await followUpService.setNextCallDate(sellerId, new Date(date));
      res.json({ message: 'Next call date updated successfully' });
    } catch (error) {
      console.error('Set next call date error:', error);
      res.status(500).json({
        error: {
          code: 'SET_NEXT_CALL_DATE_ERROR',
          message: 'Failed to set next call date',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 確度を更新
 */
router.put(
  '/:sellerId/confidence',
  [
    body('level')
      .isIn(Object.values(ConfidenceLevel))
      .withMessage('Invalid confidence level'),
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
      const { level } = req.body;

      await followUpService.updateConfidence(sellerId, level);
      res.json({ message: 'Confidence level updated successfully' });
    } catch (error) {
      console.error('Update confidence error:', error);
      res.status(500).json({
        error: {
          code: 'UPDATE_CONFIDENCE_ERROR',
          message: 'Failed to update confidence level',
          retryable: true,
        },
      });
    }
  }
);

export default router;
