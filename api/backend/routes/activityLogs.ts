import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { ActivityLogService, LogFilter } from '../services/ActivityLogService';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const activityLogService = new ActivityLogService();

// 全てのルートに認証を適用
router.use(authenticate);

/**
 * 活動ログを取得
 */
router.get(
  '/',
  [
    query('employeeId').optional().isUUID().withMessage('Invalid employee ID'),
    query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
    query('dateTo').optional().isISO8601().withMessage('Invalid date format'),
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

      const filter: LogFilter = {
        employeeId: req.query.employeeId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        activityType: req.query.activityType as string,
        sellerId: req.query.sellerId as string,
      };

      const logs = await activityLogService.getLogs(filter);
      res.json(logs);
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({
        error: {
          code: 'GET_LOGS_ERROR',
          message: 'Failed to get activity logs',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 活動統計を取得
 */
router.get(
  '/statistics',
  requireRole('admin', 'agent'),
  [
    query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
    query('dateTo').optional().isISO8601().withMessage('Invalid date format'),
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

      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const statistics = await activityLogService.getStatistics(dateFrom, dateTo);
      res.json(statistics);
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        error: {
          code: 'GET_STATISTICS_ERROR',
          message: 'Failed to get statistics',
          retryable: true,
        },
      });
    }
  }
);

export default router;
