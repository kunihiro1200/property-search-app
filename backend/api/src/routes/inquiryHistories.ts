import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { InquiryHistoryService } from '../services/InquiryHistoryService';
import { authenticate } from '../middleware/auth';

const router = Router();

// サービスインスタンスを取得する関数（テスト時にモック可能にするため）
let inquiryHistoryServiceInstance: InquiryHistoryService | null = null;
export const getInquiryHistoryService = (): InquiryHistoryService => {
  if (!inquiryHistoryServiceInstance) {
    inquiryHistoryServiceInstance = new InquiryHistoryService();
  }
  return inquiryHistoryServiceInstance;
};

// テスト用：サービスインスタンスをリセット
export const resetInquiryHistoryService = (): void => {
  inquiryHistoryServiceInstance = null;
};

// テスト用：サービスインスタンスを設定
export const setInquiryHistoryService = (service: InquiryHistoryService): void => {
  inquiryHistoryServiceInstance = service;
};

// 全てのルートに認証を適用
router.use(authenticate);

/**
 * GET /api/sellers/:sellerId/inquiry-history
 * 売主IDに紐づく問合せ履歴を取得
 */
router.get(
  '/sellers/:sellerId/inquiry-history',
  [param('sellerId').isUUID().withMessage('Invalid seller ID')],
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
      const inquiryHistories = await getInquiryHistoryService().getInquiryHistories(sellerId);

      res.json(inquiryHistories);
    } catch (error) {
      console.error('Get inquiry histories error:', error);
      res.status(500).json({
        error: {
          code: 'GET_INQUIRY_HISTORIES_ERROR',
          message: 'Failed to get inquiry histories',
          retryable: true,
        },
      });
    }
  }
);

/**
 * POST /api/sellers/:sellerId/inquiry-history
 * 新規問合せ履歴を作成
 */
router.post(
  '/sellers/:sellerId/inquiry-history',
  [
    param('sellerId').isUUID().withMessage('Invalid seller ID'),
    body('inquiryDate').isISO8601().withMessage('Invalid inquiry date'),
    body('inquirySite').optional().isString().withMessage('Invalid inquiry site'),
    body('inquiryReason').optional().isString().withMessage('Invalid inquiry reason'),
    body('isCurrentStatus').optional().isBoolean().withMessage('Invalid isCurrentStatus'),
    body('notes').optional().isString().withMessage('Invalid notes'),
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
      const inquiryHistory = await getInquiryHistoryService().createInquiryHistory({
        sellerId,
        inquiryDate: new Date(req.body.inquiryDate),
        inquirySite: req.body.inquirySite,
        inquiryReason: req.body.inquiryReason,
        isCurrentStatus: req.body.isCurrentStatus,
        notes: req.body.notes,
      });

      res.status(201).json(inquiryHistory);
    } catch (error) {
      console.error('Create inquiry history error:', error);
      res.status(500).json({
        error: {
          code: 'CREATE_INQUIRY_HISTORY_ERROR',
          message: 'Failed to create inquiry history',
          retryable: true,
        },
      });
    }
  }
);

/**
 * PUT /api/inquiry-history/:id
 * 問合せ履歴を更新
 */
router.put(
  '/inquiry-history/:id',
  [
    param('id').isUUID().withMessage('Invalid inquiry history ID'),
    body('inquiryDate').optional().isISO8601().withMessage('Invalid inquiry date'),
    body('inquirySite').optional().isString().withMessage('Invalid inquiry site'),
    body('inquiryReason').optional().isString().withMessage('Invalid inquiry reason'),
    body('isCurrentStatus').optional().isBoolean().withMessage('Invalid isCurrentStatus'),
    body('notes').optional().isString().withMessage('Invalid notes'),
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

      const { id } = req.params;
      const inquiryHistory = await getInquiryHistoryService().updateInquiryHistory(id, {
        inquiryDate: req.body.inquiryDate ? new Date(req.body.inquiryDate) : undefined,
        inquirySite: req.body.inquirySite,
        inquiryReason: req.body.inquiryReason,
        isCurrentStatus: req.body.isCurrentStatus,
        notes: req.body.notes,
      });

      res.json(inquiryHistory);
    } catch (error) {
      console.error('Update inquiry history error:', error);
      res.status(500).json({
        error: {
          code: 'UPDATE_INQUIRY_HISTORY_ERROR',
          message: 'Failed to update inquiry history',
          retryable: true,
        },
      });
    }
  }
);

/**
 * PUT /api/sellers/:sellerId/inquiry-history/:id/current-status
 * is_current_statusを更新（既存のis_current_statusをすべてfalseに更新してから、指定された問合せ履歴をtrueに更新）
 */
router.put(
  '/sellers/:sellerId/inquiry-history/:id/current-status',
  [
    param('sellerId').isUUID().withMessage('Invalid seller ID'),
    param('id').isUUID().withMessage('Invalid inquiry history ID'),
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

      const { sellerId, id } = req.params;
      await getInquiryHistoryService().updateCurrentStatus(sellerId, id);

      res.json({ success: true });
    } catch (error) {
      console.error('Update current status error:', error);
      res.status(500).json({
        error: {
          code: 'UPDATE_CURRENT_STATUS_ERROR',
          message: 'Failed to update current status',
          retryable: true,
        },
      });
    }
  }
);

/**
 * DELETE /api/inquiry-history/:id
 * 問合せ履歴を削除
 */
router.delete(
  '/inquiry-history/:id',
  [param('id').isUUID().withMessage('Invalid inquiry history ID')],
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

      const { id } = req.params;
      await getInquiryHistoryService().deleteInquiryHistory(id);

      res.status(204).send();
    } catch (error) {
      console.error('Delete inquiry history error:', error);
      res.status(500).json({
        error: {
          code: 'DELETE_INQUIRY_HISTORY_ERROR',
          message: 'Failed to delete inquiry history',
          retryable: true,
        },
      });
    }
  }
);

export default router;
