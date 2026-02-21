import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { SellerService } from '../services/SellerService.supabase';
import { authenticate } from '../middleware/auth';
import { CreateSellerRequest, ListSellersParams } from '../types';

const router = Router();
const sellerService = new SellerService();

// 全てのルートに認証を適用
router.use(authenticate);

/**
 * 売主を登録
 */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('property').notEmpty().withMessage('Property information is required'),
    body('property.address').notEmpty().withMessage('Property address is required'),
    body('property.prefecture').optional().isString().withMessage('Prefecture must be a string'),
    body('property.city').optional().isString().withMessage('City must be a string'),
    body('property.propertyType').notEmpty().withMessage('Property type is required'),
    // Phase 1 validations (all optional for now)
    body('inquirySource').optional().isString().withMessage('Inquiry source must be a string'),
    body('inquiryYear').optional().isInt({ min: 2000, max: 2100 }).withMessage('Inquiry year must be a valid year'),
    body('inquiryDate').optional().isISO8601().withMessage('Inquiry date must be a valid date'),
    body('inquiryDatetime').optional().isISO8601().withMessage('Inquiry datetime must be a valid datetime'),
    body('confidenceLevel').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid confidence level'),
    body('firstCallerInitials').optional().isString().withMessage('First caller initials must be a string'),
    body('sellerNumber').optional().matches(/^AA\d{5}$/).withMessage('Seller number must be in format AA{5-digit number}'),
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

      const data: CreateSellerRequest = req.body;
      const result = await sellerService.createSeller(data, req.employee!.id);

      // Phase 1: Return with duplicate warning if applicable
      res.status(201).json(result);
    } catch (error) {
      console.error('Create seller error:', error);
      res.status(500).json({
        error: {
          code: 'CREATE_SELLER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create seller',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 売主リストを取得
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
    // Phase 1 filter validations
    query('inquirySource').optional().isString().withMessage('Inquiry source must be a string'),
    query('inquiryYearFrom').optional().isInt({ min: 2000 }).withMessage('Inquiry year from must be a valid year'),
    query('inquiryYearTo').optional().isInt({ min: 2000 }).withMessage('Inquiry year to must be a valid year'),
    query('isUnreachable').optional().isBoolean().withMessage('Is unreachable must be a boolean'),
    query('confidenceLevel').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid confidence level'),
    query('firstCaller').optional().isString().withMessage('First caller must be a string'),
    query('duplicateConfirmed').optional().isBoolean().withMessage('Duplicate confirmed must be a boolean'),
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

      const params: ListSellersParams = {
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 50,
        status: req.query.status as any,
        assignedTo: req.query.assignedTo as string,
        nextCallDateFrom: req.query.nextCallDateFrom ? new Date(req.query.nextCallDateFrom as string) : undefined,
        nextCallDateTo: req.query.nextCallDateTo ? new Date(req.query.nextCallDateTo as string) : undefined,
        sortBy: (req.query.sortBy as string) || 'created_at',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
        // Phase 1 filters
        inquirySource: req.query.inquirySource as string,
        inquiryYearFrom: req.query.inquiryYearFrom ? parseInt(req.query.inquiryYearFrom as string) : undefined,
        inquiryYearTo: req.query.inquiryYearTo ? parseInt(req.query.inquiryYearTo as string) : undefined,
        isUnreachable: req.query.isUnreachable === 'true' ? true : req.query.isUnreachable === 'false' ? false : undefined,
        confidenceLevel: req.query.confidenceLevel as any,
        firstCaller: req.query.firstCaller as string,
        duplicateConfirmed: req.query.duplicateConfirmed === 'true' ? true : req.query.duplicateConfirmed === 'false' ? false : undefined,
      };

      const result = await sellerService.listSellers(params);
      res.json(result);
    } catch (error) {
      console.error('List sellers error:', error);
      res.status(500).json({
        error: {
          code: 'LIST_SELLERS_ERROR',
          message: 'Failed to list sellers',
          retryable: true,
        },
      });
    }
  }
);

/**
 * 売主を検索
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    console.log('🔍 Search endpoint called with query:', query);

    if (!query) {
      console.log('❌ No query provided');
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required',
          retryable: false,
        },
      });
    }

    console.log('📞 Calling sellerService.searchSellers...');
    const sellers = await sellerService.searchSellers(query);
    console.log(`✅ Search completed, returning ${sellers.length} sellers`);
    res.json(sellers);
  } catch (error) {
    console.error('❌ Search sellers error:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_SELLERS_ERROR',
        message: 'Failed to search sellers',
        retryable: true,
      },
    });
  }
});

/**
 * 訪問統計を取得
 * GET /api/sellers/visit-stats?month=2024-12
 */
router.get('/visit-stats', async (req: Request, res: Response) => {
  try {
    console.log('📊 Visit stats endpoint called');
    console.log('Query params:', req.query);
    
    const { month } = req.query;
    
    // monthパラメータがない場合は現在の月を使用
    const targetMonth = month ? String(month) : new Date().toISOString().slice(0, 7);
    
    console.log('Target month:', targetMonth);
    
    const stats = await sellerService.getVisitStats(targetMonth);
    
    console.log('Stats result:', stats);
    
    res.json(stats);
  } catch (error) {
    console.error('Get visit stats error:', error);
    res.status(500).json({
      error: {
        code: 'VISIT_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get visit stats',
        retryable: true,
      },
    });
  }
});

/**
 * パフォーマンスメトリクスを取得
 * GET /api/sellers/performance-metrics?month=2024-12
 */
router.get('/performance-metrics', [
  query('month').notEmpty().withMessage('Month is required').matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MONTH_FORMAT',
          message: 'Month must be in YYYY-MM format',
          retryable: false,
        },
      });
    }

    const { month } = req.query;
    const { PerformanceMetricsService } = await import('../services/PerformanceMetricsService');
    const performanceMetricsService = new PerformanceMetricsService();
    
    // 拡張メトリクス（月平均を含む）を返す
    const metrics = await performanceMetricsService.calculateEnhancedMetrics(month as string);
    
    res.json(metrics);
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      error: {
        code: 'CALCULATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to calculate performance metrics',
        retryable: true,
      },
    });
  }
});

/**
 * 売主情報を取得
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const seller = await sellerService.getSeller(req.params.id);

    if (!seller) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Seller not found',
          retryable: false,
        },
      });
    }

    res.json(seller);
  } catch (error) {
    console.error('Get seller error:', error);
    res.status(500).json({
      error: {
        code: 'GET_SELLER_ERROR',
        message: 'Failed to get seller',
        retryable: true,
      },
    });
  }
});

/**
 * 売主の重複案件を取得
 */
router.get('/:id/duplicates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 売主情報を取得
    const seller = await sellerService.getSeller(id);
    
    if (!seller) {
      return res.status(404).json({
        error: {
          code: 'SELLER_NOT_FOUND',
          message: 'Seller not found',
          retryable: false,
        },
      });
    }
    
    // 重複を検出（自分自身を除外）
    const { duplicateDetectionService } = await import('../services/DuplicateDetectionService');
    const duplicates = await duplicateDetectionService.instance.checkDuplicates(
      seller.phoneNumber,
      seller.email,
      id
    );
    
    res.json({ duplicates });
  } catch (error) {
    console.error('Get duplicates error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get duplicates',
        retryable: true,
      },
    });
  }
});

// Valid site options
const VALID_SITE_OPTIONS = [
  'ウ',
  'ビ',
  'H',
  'お',
  'Y',
  'す',
  'a',
  'L',
  'エ',
  '近所',
  'チ',
  'P',
  '紹',
  'リ',
  '買',
  'HP',
  '知合',
  'at-homeの掲載を見て',
  '2件目以降査定'
];

/**
 * 売主情報を更新
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    console.log('📝 Update seller request:', {
      sellerId: req.params.id,
      body: req.body,
    });
    
    // Validate site field if provided
    if (req.body.site !== undefined && req.body.site !== null) {
      if (!VALID_SITE_OPTIONS.includes(req.body.site)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_SITE',
            message: 'Invalid site value',
            details: { validOptions: VALID_SITE_OPTIONS },
            retryable: false,
          },
        });
      }
    }
    
    // Validate valuation amounts if provided
    if (req.body.valuationAmount1 !== undefined && req.body.valuationAmount1 !== null) {
      const amount1 = Number(req.body.valuationAmount1);
      if (isNaN(amount1) || amount1 <= 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VALUATION_AMOUNT',
            message: 'Valuation amount 1 must be a positive number',
            retryable: false,
          },
        });
      }
    }
    
    if (req.body.valuationAmount2 !== undefined && req.body.valuationAmount2 !== null) {
      const amount2 = Number(req.body.valuationAmount2);
      if (isNaN(amount2) || amount2 <= 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VALUATION_AMOUNT',
            message: 'Valuation amount 2 must be a positive number',
            retryable: false,
          },
        });
      }
    }
    
    if (req.body.valuationAmount3 !== undefined && req.body.valuationAmount3 !== null) {
      const amount3 = Number(req.body.valuationAmount3);
      if (isNaN(amount3) || amount3 <= 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VALUATION_AMOUNT',
            message: 'Valuation amount 3 must be a positive number',
            retryable: false,
          },
        });
      }
    }
    
    // Optional: Check valuation amount order (warning only, not blocking)
    if (req.body.valuationAmount1 && req.body.valuationAmount2) {
      const amount1 = Number(req.body.valuationAmount1);
      const amount2 = Number(req.body.valuationAmount2);
      if (amount2 < amount1) {
        console.warn('⚠️ Valuation amount 2 is less than amount 1');
      }
    }
    
    if (req.body.valuationAmount2 && req.body.valuationAmount3) {
      const amount2 = Number(req.body.valuationAmount2);
      const amount3 = Number(req.body.valuationAmount3);
      if (amount3 < amount2) {
        console.warn('⚠️ Valuation amount 3 is less than amount 2');
      }
    }
    
    // 予約情報が更新される場合、カレンダーイベントを作成/更新
    const { appointmentDate, assignedTo, appointmentNotes } = req.body;
    
    if (appointmentDate && assignedTo) {
      console.log('📅 Appointment data detected, will create/update calendar event');
      // SellerServiceに予約情報も渡す
      const seller = await sellerService.updateSellerWithAppointment(
        req.params.id,
        req.body,
        req.employee!.id
      );
      res.json(seller);
    } else {
      // 通常の更新
      const seller = await sellerService.updateSeller(req.params.id, req.body);
      res.json(seller);
    }
  } catch (error) {
    console.error('Update seller error:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_SELLER_ERROR',
        message: 'Failed to update seller',
        retryable: true,
      },
    });
  }
});

/**
 * Phase 1: Mark seller as unreachable
 */
router.post('/:id/mark-unreachable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const seller = await sellerService.markAsUnreachable(id);
    res.json(seller);
  } catch (error) {
    console.error('Mark unreachable error:', error);
    res.status(500).json({
      error: {
        code: 'MARK_UNREACHABLE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to mark seller as unreachable',
        retryable: true,
      },
    });
  }
});

/**
 * Phase 1: Clear unreachable status
 */
router.post('/:id/clear-unreachable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const seller = await sellerService.clearUnreachable(id);
    res.json(seller);
  } catch (error) {
    console.error('Clear unreachable error:', error);
    res.status(500).json({
      error: {
        code: 'CLEAR_UNREACHABLE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to clear unreachable status',
        retryable: true,
      },
    });
  }
});

/**
 * Phase 1: Confirm duplicate seller
 */
router.post('/:id/confirm-duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const seller = await sellerService.confirmDuplicate(id, req.employee!.id);
    res.json(seller);
  } catch (error) {
    console.error('Confirm duplicate error:', error);
    res.status(500).json({
      error: {
        code: 'CONFIRM_DUPLICATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to confirm duplicate',
        retryable: true,
      },
    });
  }
});

/**
 * Phase 1: Get duplicate history for a seller
 */
router.get('/:id/duplicate-history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await sellerService.getDuplicateHistory(id);
    res.json(history);
  } catch (error) {
    console.error('Get duplicate history error:', error);
    res.status(500).json({
      error: {
        code: 'GET_DUPLICATE_HISTORY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get duplicate history',
        retryable: true,
      },
    });
  }
});

/**
 * Phase 1: Check for duplicate sellers
 */
router.get('/check-duplicate', [
  query('phone').notEmpty().withMessage('Phone number is required'),
  query('email').optional().isEmail().withMessage('Invalid email format'),
  query('excludeId').optional().isUUID().withMessage('Exclude ID must be a valid UUID'),
], async (req: Request, res: Response) => {
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

    const { phone, email, excludeId } = req.query;
    const matches = await sellerService.checkDuplicates(
      phone as string,
      email as string | undefined,
      excludeId as string | undefined
    );
    
    res.json({
      hasDuplicates: matches.length > 0,
      matches,
      canProceed: true,
    });
  } catch (error) {
    console.error('Check duplicate error:', error);
    res.status(500).json({
      error: {
        code: 'CHECK_DUPLICATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to check for duplicates',
        retryable: true,
      },
    });
  }
});

/**
 * 査定額メールを送信
 */
router.post('/:id/send-valuation-email', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // キャッシュをクリアして最新の売主情報を取得
    const { CacheHelper } = await import('../utils/cache');
    const cacheKey = CacheHelper.generateKey('seller', id);
    await CacheHelper.del(cacheKey);

    // 売主情報を取得
    const seller = await sellerService.getSeller(id);
    if (!seller) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Seller not found',
          retryable: false,
        },
      });
    }

    // メールアドレスが設定されているか確認
    if (!seller.email) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Seller email is not set',
          retryable: false,
        },
      });
    }

    // 査定額1、2、3が設定されているか確認
    console.log('📊 Checking valuation amounts:', {
      valuationAmount1: seller.valuationAmount1,
      valuationAmount2: seller.valuationAmount2,
      valuationAmount3: seller.valuationAmount3,
    });
    
    if (!seller.valuationAmount1 || !seller.valuationAmount2 || !seller.valuationAmount3) {
      console.log('❌ Valuation amounts not set');
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valuation amounts are not calculated yet',
          retryable: false,
        },
      });
    }

    // 固定資産税路線価を取得
    const fixedAssetTaxRoadPrice = seller.property?.fixedAssetTaxRoadPrice || 
                                   seller.property?.sellerFixedAssetTaxRoadPrice;

    // 査定データを準備
    const valuationData = {
      valuationAmount1: seller.valuationAmount1,
      valuationAmount2: seller.valuationAmount2,
      valuationAmount3: seller.valuationAmount3,
      fixedAssetTaxRoadPrice,
      landArea: seller.property?.landArea,
      buildingArea: seller.property?.buildingArea,
    };

    // メール送信
    const { EmailService } = await import('../services/EmailService.supabase');
    const emailService = new EmailService();
    const result = await emailService.sendValuationEmail(
      seller,
      valuationData,
      req.employee!.email,
      req.employee!.id
    );

    if (!result.success) {
      return res.status(500).json({
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: result.error || 'Failed to send valuation email',
          retryable: true,
        },
      });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      sentAt: result.sentAt,
    });
  } catch (error) {
    console.error('Send valuation email error:', error);
    res.status(500).json({
      error: {
        code: 'EMAIL_SEND_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send valuation email',
        retryable: true,
      },
    });
  }
});

/**
 * 売主の追客ログ履歴を取得
 */
router.get(
  '/:sellerNumber/follow-up-logs/history',
  [
    query('refresh').optional().isBoolean().withMessage('Refresh must be a boolean'),
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

      const { sellerNumber } = req.params;
      const forceRefresh = req.query.refresh === 'true';

      // FollowUpLogHistoryServiceを動的にインポート
      const { followUpLogHistoryService } = await import('../services/FollowUpLogHistoryService');

      // 履歴ログを取得
      const logs = await followUpLogHistoryService.getHistoricalLogs(sellerNumber, forceRefresh);

      // 最終更新時刻を取得
      const lastUpdated = await followUpLogHistoryService.getLastUpdateTime();

      res.json({
        success: true,
        data: logs,
        cached: !forceRefresh,
        lastUpdated: lastUpdated?.toISOString() || null,
      });
    } catch (error) {
      console.error('Get follow-up log history error:', error);
      res.status(500).json({
        success: false,
        error: 'FOLLOW_UP_LOG_HISTORY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get follow-up log history',
      });
    }
  }
);

export default router;
