// 買主リストのAPIルート
import { Router, Request, Response } from 'express';
import { BuyerService } from '../services/BuyerService';
import { BuyerSyncService } from '../services/BuyerSyncService';
import { EmailHistoryService } from '../services/EmailHistoryService';
import { relatedBuyerService } from '../services/RelatedBuyerService';
import { uuidValidationMiddleware } from '../middleware/uuidValidator';
import { ValidationError, NotFoundError, ServiceError } from '../errors';
import { EnhancedAutoSyncService } from '../services/EnhancedAutoSyncService';
import { BuyerTemplateService } from '../services/BuyerTemplateService';

const router = Router();
const buyerService = new BuyerService();
const buyerSyncService = new BuyerSyncService();
const emailHistoryService = new EmailHistoryService();

// EnhancedAutoSyncServiceのインスタンスを作成（買主同期用）
const enhancedAutoSyncService = new EnhancedAutoSyncService(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 買主テンプレート取得（/:idの前に配置）
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const buyerTemplateService = new BuyerTemplateService();
    const templates = await buyerTemplateService.getBuyerTemplates();
    res.json(templates);
  } catch (error: any) {
    console.error('Failed to fetch buyer templates:', error);
    res.status(500).json({ error: error.message || 'テンプレートの取得に失敗しました' });
  }
});

// 次の買主番号を取得（/:idの前に配置）
router.get('/next-buyer-number', async (req: Request, res: Response) => {
  try {
    // BuyerServiceの公開メソッドを使用
    const buyerNumber = await buyerService.getNextBuyerNumber();
    res.json({ buyerNumber });
  } catch (error: any) {
    console.error('Failed to generate buyer number:', error);
    res.status(500).json({ error: error.message || '買主番号の生成に失敗しました' });
  }
});

// 一覧取得
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      search,
      status,
      assignee,
      dateFrom,
      dateTo,
      sortBy = 'reception_date',
      sortOrder = 'desc',
      withStatus, // 新しいパラメータ: calculated_statusを含めるかどうか
      includeDeleted, // 削除済み買主を含めるかどうか
    } = req.query;

    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      search: search as string,
      status: status as string,
      assignee: assignee as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      includeDeleted: includeDeleted === 'true', // クエリパラメータをbooleanに変換
    };

    // withStatus=trueの場合、またはstatusパラメータが指定されている場合は
    // ステータス算出を含む結果を返す
    if (withStatus === 'true' || status) {
      // statusパラメータがある場合は、そのステータスでフィルタリング
      if (status) {
        // 注意: ステータスフィルタリングは全買主を取得する必要があるため、時間がかかる
        // 将来的にはステータスをDBに保存して直接フィルタリングすることを推奨
        const result = await buyerService.getBuyersByStatus(status, options);
        return res.json(result);
      }
      
      // withStatus=trueの場合は、ページネーション後にステータスを付与（高速化）
      const result = await buyerService.getAll(options);
      
      // ページネーション後の買主のみステータスを計算
      const { calculateBuyerStatus, calculateBuyerStatusComplete } = await import('../services/BuyerStatusCalculator');
      const buyersWithStatus = result.data.map((buyer: any) => {
        try {
          // まずPriority 1-16を評価
          let statusResult = calculateBuyerStatus(buyer);
          
          // Priority 1-16で一致しなければPriority 17-37を評価
          if (!statusResult.status || statusResult.priority === 0) {
            statusResult = calculateBuyerStatusComplete(buyer);
          }
          
          return {
            ...buyer,
            calculated_status: statusResult.status,
            status_priority: statusResult.priority,
            status_color: statusResult.color
          };
        } catch (error) {
          console.error(`Error calculating status for buyer ${buyer.buyer_number}:`, error);
          return {
            ...buyer,
            calculated_status: '',
            status_priority: 999,
            status_color: '#9E9E9E'
          };
        }
      });
      
      return res.json({
        ...result,
        data: buyersWithStatus
      });
    }

    // デフォルトの動作（既存の動作を維持）
    const result = await buyerService.getAll(options);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching buyers:', error);
    res.status(500).json({ error: error.message });
  }
});

// 統計取得
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await buyerService.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching buyer stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ステータスカテゴリー一覧取得
router.get('/status-categories', async (_req: Request, res: Response) => {
  try {
    const categories = await buyerService.getStatusCategories();
    res.json(categories);
  } catch (error: any) {
    console.error('[GET /buyers/status-categories] Error:', error);
    res.status(500).json({ error: error.message || 'ステータスカテゴリーの取得に失敗しました' });
  }
});

// 同期実行
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    if (buyerSyncService.isSyncInProgress()) {
      return res.status(409).json({ error: 'Sync is already in progress' });
    }

    // EnhancedAutoSyncServiceを使用して完全同期（削除同期を含む）
    await enhancedAutoSyncService.initializeBuyer();
    const enhancedResult = await enhancedAutoSyncService.syncBuyers();
    
    // 従来のBuyerSyncServiceも実行（互換性のため）
    const result = await buyerSyncService.syncAll();
    
    // 結果を統合
    const combinedResult = {
      ...result,
      missingBuyers: enhancedResult.missingBuyers.length,
      updatedBuyers: enhancedResult.updatedBuyers.length,
      deletedBuyers: enhancedResult.deletedBuyers.length,
      deletionSyncResult: enhancedResult.deletionSyncResult,
    };
    
    res.json(combinedResult);
  } catch (error: any) {
    console.error('Error syncing buyers:', error);
    res.status(500).json({ error: error.message });
  }
});

// 同期ステータス取得
router.get('/sync/status', async (_req: Request, res: Response) => {
  try {
    const stats = await buyerSyncService.getSyncStats();
    const isSyncing = buyerSyncService.isSyncInProgress();
    
    res.json({
      isSyncing,
      ...stats
    });
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: error.message });
  }
});

// 検索
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = '20' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await buyerService.search(q as string, parseInt(limit as string, 10));
    res.json(results);
  } catch (error: any) {
    console.error('Error searching buyers:', error);
    res.status(500).json({ error: error.message });
  }
});

// CSVエクスポート
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { search, status, assignee, dateFrom, dateTo } = req.query;

    const data = await buyerService.getExportData({
      search: search as string,
      status: status as string,
      assignee: assignee as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    // CSVヘッダー
    if (data.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('"') || str.includes('\n') 
            ? `"${str}"` 
            : str;
        }).join(',')
      )
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=buyers_${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csvRows.join('\n')); // BOM for Excel
  } catch (error: any) {
    console.error('Error exporting buyers:', error);
    res.status(500).json({ error: error.message });
  }
});

// 新規買主作成
router.post('/', async (req: Request, res: Response) => {
  try {
    const buyerData = req.body;

    // 基本的なバリデーション
    if (!buyerData.name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const newBuyer = await buyerService.create(buyerData);
    res.status(201).json(newBuyer);
  } catch (error: any) {
    console.error('Error creating buyer:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 具体的なルート（/:id よりも前に定義する必要がある） =====

// 紐づく物件取得
router.get('/:id/properties', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // buyer_numberをそのまま使用（UUID判定不要）
    const properties = await buyerService.getLinkedProperties(id);
    res.json(properties);
  } catch (error: any) {
    console.error('Error fetching linked properties:', error);
    res.status(500).json({ error: error.message });
  }
});

// 近隣物件取得
router.get('/:id/nearby-properties', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { propertyNumber } = req.query;
    
    if (!propertyNumber) {
      return res.status(400).json({ error: 'propertyNumber is required' });
    }
    
    const result = await buyerService.getNearbyProperties(propertyNumber as string);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching nearby properties:', error);
    res.status(500).json({ error: error.message });
  }
});

// 過去買主番号取得
router.get('/:id/past-buyer-numbers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pastBuyerNumbers = await buyerService.getPastBuyerNumbers(id);
    res.json(pastBuyerNumbers);
  } catch (error: any) {
    console.error('Error fetching past buyer numbers:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// 完全な問い合わせ履歴取得（旧形式）
router.get('/:id/inquiry-history-legacy', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await buyerService.getCompleteInquiryHistory(id);
    res.json(history);
  } catch (error: any) {
    console.error('Error fetching inquiry history:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// 問い合わせ履歴取得（買主詳細ページ用）
router.get('/:id/inquiry-history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // buyer_numberで直接検索
    const buyer = await buyerService.getByBuyerNumber(id);
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }
    
    // getInquiryHistoryメソッドを使用（内部でbuyer_numberベースの処理を実行）
    const inquiryHistory = await buyerService.getInquiryHistory(buyer.buyer_number);
    res.json({ inquiryHistory });
  } catch (error: any) {
    console.error('Error fetching inquiry history:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// メール送信履歴を保存
router.post('/:buyerId/email-history', async (req: Request, res: Response) => {
  try {
    const { buyerId } = req.params;
    const { propertyNumbers, recipientEmail, subject, body, sentBy, emailType } = req.body;

    // Validation
    if (!propertyNumbers || !Array.isArray(propertyNumbers) || propertyNumbers.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: propertyNumbers array is required and cannot be empty',
      });
    }

    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: recipientEmail is required',
      });
    }

    if (!subject || !body) {
      return res.status(400).json({
        error: 'Invalid request: subject and body are required',
      });
    }

    if (!sentBy) {
      return res.status(400).json({
        error: 'Invalid request: sentBy is required',
      });
    }

    // Save email history
    const historyIds = await emailHistoryService.saveEmailHistory({
      buyerId,
      propertyNumbers,
      recipientEmail,
      subject,
      body,
      sentBy,
      emailType,
    });

    res.json({
      success: true,
      message: 'Email history saved successfully',
      historyIds,
    });
  } catch (error: any) {
    console.error('Error saving email history:', error);
    res.status(500).json({ error: error.message });
  }
});

// メール送信履歴を取得
router.get('/:buyerId/email-history', async (req: Request, res: Response) => {
  try {
    const { buyerId } = req.params;
    
    // UUIDかどうかで判定
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(buyerId);
    
    // 買主番号の場合は、まずbuyer_idを取得
    let actualBuyerId = buyerId;
    if (!isUuid) {
      const buyer = await buyerService.getByBuyerNumber(buyerId);
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      actualBuyerId = buyer.buyer_id; // ✅ buyer.buyer_idを使用（UUID）
    }
    
    const emailHistory = await emailHistoryService.getEmailHistory(actualBuyerId);
    res.json({ emailHistory });
  } catch (error: any) {
    console.error('Error fetching email history:', error);
    res.status(500).json({ error: error.message });
  }
});

// 関連買主を取得
router.get('/:id/related', uuidValidationMiddleware('id'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    console.log(`[API] GET /buyers/${id}/related - Request received`);
    
    // UUIDかどうかで判定
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 買主番号の場合は、まずbuyer_idを取得
    let buyerId = id;
    if (!isUuid) {
      console.log(`[API] Resolving buyer number ${id} to UUID`);
      const buyer = await buyerService.getByBuyerNumber(id);
      if (!buyer) {
        console.warn(`[API] Buyer not found for buyer_number: ${id}`);
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Buyer not found',
          code: 'BUYER_NOT_FOUND',
          details: { buyer_number: id }
        });
      }
      buyerId = buyer.buyer_id; // ✅ buyer.buyer_idを使用（UUID）
      console.log(`[API] Resolved buyer_number ${id} to UUID ${buyerId}`);
    }
    
    // 現在の買主を取得
    const currentBuyer = await buyerService.getById(buyerId);
    if (!currentBuyer) {
      console.warn(`[API] Buyer not found for UUID: ${buyerId}`);
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Buyer not found',
        code: 'BUYER_NOT_FOUND',
        details: { buyer_id: buyerId }
      });
    }

    // 関連買主を検索
    const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
    
    const duration = Date.now() - startTime;
    console.log(`[API] GET /buyers/${id}/related - Success (${duration}ms, ${relatedBuyers.length} related buyers)`);

    res.json({
      current_buyer: currentBuyer,
      related_buyers: relatedBuyers,
      total_count: relatedBuyers.length
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[API] GET /buyers/${id}/related - Error (${duration}ms):`, error);
    
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: error.message,
        code: 'BUYER_NOT_FOUND'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch related buyers',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 統合問合せ履歴を取得
router.get('/:id/unified-inquiry-history', uuidValidationMiddleware('id'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    console.log(`[API] GET /buyers/${id}/unified-inquiry-history - Request received`);
    
    // UUIDかどうかで判定
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 買主番号の場合は、まずbuyer_idを取得
    let buyerId = id;
    if (!isUuid) {
      console.log(`[API] Resolving buyer number ${id} to UUID`);
      const buyer = await buyerService.getByBuyerNumber(id);
      if (!buyer) {
        console.warn(`[API] Buyer not found for buyer_number: ${id}`);
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Buyer not found',
          code: 'BUYER_NOT_FOUND',
          details: { buyer_number: id }
        });
      }
      buyerId = buyer.buyer_id; // ✅ buyer.buyer_idを使用（UUID）
      console.log(`[API] Resolved buyer_number ${id} to UUID ${buyerId}`);
    }
    
    // 現在の買主を取得
    const currentBuyer = await buyerService.getById(buyerId);
    if (!currentBuyer) {
      console.warn(`[API] Buyer not found for UUID: ${buyerId}`);
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Buyer not found',
        code: 'BUYER_NOT_FOUND',
        details: { buyer_id: buyerId }
      });
    }

    // 関連買主を取得
    const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
    
    // 全ての買主IDを集める
    const allBuyerIds = [buyerId, ...relatedBuyers.map(rb => rb.id)];
    
    // 統合問合せ履歴を取得
    const inquiries = await relatedBuyerService.getUnifiedInquiryHistory(allBuyerIds);
    
    // 買主番号のリストを作成
    const buyerNumbers = [
      currentBuyer.buyer_number,
      ...relatedBuyers.map(rb => rb.buyer_number)
    ];
    
    const duration = Date.now() - startTime;
    console.log(`[API] GET /buyers/${id}/unified-inquiry-history - Success (${duration}ms, ${inquiries.length} inquiries)`);
    
    if (duration > 1000) {
      console.warn(`[API] Slow query detected: ${duration}ms for buyer ${id}`);
    }

    res.json({
      inquiries,
      buyer_numbers: buyerNumbers
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[API] GET /buyers/${id}/unified-inquiry-history - Error (${duration}ms):`, error);
    
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: error.message,
        code: 'BUYER_NOT_FOUND'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch unified inquiry history',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 競合チェックエンドポイント（GET）
router.get('/:id/conflict-check', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { field, timestamp } = req.query;

    if (!field || !timestamp) {
      return res.status(400).json({ error: 'field and timestamp are required' });
    }

    // UUIDかどうかで判定
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 買主番号の場合は、まずbuyer_idを取得
    let buyerId = id;
    if (!isUuid) {
      const buyer = await buyerService.getByBuyerNumber(id);
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      buyerId = buyer.buyer_id; // ✅ buyer.buyer_idを使用（UUID）
    }

    // 買主を取得
    const buyer = await buyerService.getById(buyerId);
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    // 競合チェック: last_synced_atがtimestampより新しい場合は競合
    const clientTimestamp = new Date(timestamp as string);
    const lastSyncedAt = buyer.last_synced_at ? new Date(buyer.last_synced_at) : null;
    const updatedAt = buyer.updated_at ? new Date(buyer.updated_at) : null;

    // 競合判定: DBが更新されていて、かつクライアントのタイムスタンプより新しい場合
    const hasConflict = updatedAt && updatedAt > clientTimestamp;

    if (hasConflict) {
      return res.json({
        hasConflict: true,
        conflictingValue: buyer[field as string],
        conflictingUser: 'another user', // TODO: 実際のユーザー情報を取得
        conflictingTimestamp: updatedAt?.toISOString()
      });
    }

    return res.json({
      hasConflict: false
    });
  } catch (error: any) {
    console.error('Error checking conflict:', error);
    res.status(500).json({ error: error.message });
  }
});

// 競合解決エンドポイント
router.post('/:id/conflict', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, conflicts } = req.body;

    // resolution: 'db_wins' | 'spreadsheet_wins' | 'manual'
    if (!resolution) {
      return res.status(400).json({ error: 'Resolution strategy is required' });
    }

    // Get user info from request
    const userId = (req as any).employee?.id || 'system';
    const userEmail = (req as any).employee?.email || 'system@example.com';

    // 買主を取得
    const buyer = await buyerService.getById(id);
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    if (resolution === 'db_wins') {
      // DBの値でスプレッドシートを強制上書き
      // conflictsから更新するフィールドを抽出
      const updateData: Record<string, any> = {};
      if (conflicts && Array.isArray(conflicts)) {
        for (const conflict of conflicts) {
          updateData[conflict.fieldName] = conflict.dbValue;
        }
      }

      // force=trueで更新を実行
      const result = await buyerService.updateWithSync(
        id,
        updateData,
        userId,
        userEmail,
        { force: true }
      );

      return res.json({
        success: true,
        buyer: result.buyer,
        syncStatus: result.syncResult.syncStatus
      });
    } else if (resolution === 'spreadsheet_wins') {
      // スプレッドシートの値を維持（DBを更新しない）
      // last_synced_atを更新して競合状態を解消
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      
      await supabase
        .from('buyers')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', id);

      return res.json({
        success: true,
        message: 'Spreadsheet values preserved',
        syncStatus: 'synced'
      });
    } else {
      return res.status(400).json({ error: 'Invalid resolution strategy' });
    }
  } catch (error: any) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 汎用ルート（最後に定義する必要がある） =====

// 個別取得（ID）
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force, includeDeleted } = req.query;
    
    // UUIDかどうかで判定
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // force=trueの場合はスプレッドシートから強制同期
    if (force === 'true') {
      console.log(`[Buyers API] Force sync from spreadsheet for buyer: ${id}`);
      
      // 買主番号を取得
      let buyerNumber: string;
      if (isUuid) {
        const buyer = await buyerService.getById(id);
        if (!buyer) {
          return res.status(404).json({ error: 'Buyer not found' });
        }
        buyerNumber = buyer.buyer_number;
      } else {
        buyerNumber = id;
      }
      
      // スプレッドシートから同期（EnhancedAutoSyncServiceを使用）
      try {
        await enhancedAutoSyncService.initializeBuyer(); // 初期化
        const syncResult = await enhancedAutoSyncService.syncUpdatedBuyers([buyerNumber]);
        console.log(`[Buyers API] Successfully synced buyer ${buyerNumber} from spreadsheet:`, syncResult);
      } catch (syncError: any) {
        console.error(`[Buyers API] Failed to sync buyer ${buyerNumber} from spreadsheet:`, syncError);
        // 同期エラーでも続行（DBから取得）
      }
    }
    
    // includeDeletedパラメータを考慮
    const includeDeletedFlag = includeDeleted === 'true';
    
    const data = isUuid 
      ? await buyerService.getById(id)
      : await buyerService.getByBuyerNumber(id, includeDeletedFlag);
    
    if (!data) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching buyer:', error);
    res.status(500).json({ error: error.message });
  }
});

// 買主情報更新
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { force, sync } = req.query;

    // 基本的なバリデーション
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Update data is required' });
    }

    // 更新不可フィールドを自動的に除外（エラーにせず、単に無視する）
    const protectedFields = ['buyer_id', 'created_at', 'synced_at', 'updated_at'];
    const sanitizedData = { ...updateData };
    protectedFields.forEach(field => {
      delete sanitizedData[field];
    });

    // 除外後にデータが空になった場合はエラー
    if (Object.keys(sanitizedData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Get user info from request (set by auth middleware)
    const userId = (req as any).employee?.id || 'system';
    const userEmail = (req as any).employee?.email || 'system@example.com';

    // idがUUIDか買主番号かを判定
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let buyerNumber = id;

    console.log(`[PUT /buyers/:id] id=${id}, isUuid=${isUuid}`);

    // UUIDの場合は買主番号を取得（後方互換性のため）
    if (isUuid) {
      const buyer = await buyerService.getById(id);
      console.log(`[PUT /buyers/:id] getById result:`, buyer ? `found (buyer_number=${buyer.buyer_number})` : 'not found');
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      buyerNumber = buyer.buyer_number; // buyer_numberを取得
    }

    console.log(`[PUT /buyers/:id] buyerNumber=${buyerNumber}`);

    // sync=trueの場合は双方向同期を使用
    if (sync === 'true') {
      const result = await buyerService.updateWithSync(
        buyerNumber,
        sanitizedData,
        userId,
        userEmail,
        { force: force === 'true' }
      );

      // 競合がある場合は409を返す
      if (result.syncResult.conflict && result.syncResult.conflict.length > 0) {
        return res.status(409).json({
          error: 'Conflict detected',
          buyer: result.buyer,
          syncStatus: result.syncResult.syncStatus,
          conflicts: result.syncResult.conflict
        });
      }

      return res.json({
        ...result.buyer,
        syncStatus: result.syncResult.syncStatus,
        syncError: result.syncResult.error
      });
    }

    // 従来の更新（同期なし）
    const updatedBuyer = await buyerService.update(buyerNumber, sanitizedData, userId, userEmail);
    res.json(updatedBuyer);
  } catch (error: any) {
    console.error('Error updating buyer:', error);
    
    if (error.message === 'Buyer not found') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// 買主へのメール送信
router.post('/:id/send-email', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { to, subject, content, htmlBody, selectedImages, templateType } = req.body;

    console.log('[POST /buyers/:id/send-email] Request received:', {
      buyerId: id,
      to,
      subject,
      contentLength: content?.length || 0,
      htmlBodyLength: htmlBody?.length || 0,
      hasImages: selectedImages && Array.isArray(selectedImages) && selectedImages.length > 0,
      imageCount: selectedImages?.length || 0,
      templateType,
    });

    // バリデーション
    if (!to || !subject || !content) {
      console.error('[POST /buyers/:id/send-email] Validation failed:', { to: !!to, subject: !!subject, content: !!content });
      return res.status(400).json({ error: '宛先、件名、本文は必須です' });
    }

    // 買主情報を取得
    const buyer = await buyerService.getByBuyerNumber(id);
    if (!buyer) {
      console.error('[POST /buyers/:id/send-email] Buyer not found:', id);
      return res.status(404).json({ error: '買主が見つかりません' });
    }

    console.log('[POST /buyers/:id/send-email] Buyer found:', {
      buyerNumber: buyer.buyer_number,
      name: buyer.name,
      email: buyer.email,
    });

    // EmailServiceを使用してGmail送信
    const { EmailService } = require('../services/EmailService');
    const emailService = new EmailService();

    console.log('[POST /buyers/:id/send-email] Calling sendBuyerEmail...');

    // メール送信（画像添付対応）
    const result = await emailService.sendBuyerEmail({
      to: to,
      subject: subject,
      body: htmlBody || content,
      selectedImages: selectedImages || [], // 画像添付データ
    });

    console.log('[POST /buyers/:id/send-email] sendBuyerEmail result:', {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });

    if (!result.success) {
      console.error('[POST /buyers/:id/send-email] Email sending failed:', result.error);
      throw new Error(result.error || 'メール送信に失敗しました');
    }

    // アクティビティログを記録
    try {
      const { ActivityLogService } = require('../services/ActivityLogService');
      const activityLogService = new ActivityLogService();
      
      // employee_idがない場合はログを記録しない（UUIDが必須のため）
      const employeeId = (req as any).employee?.id;
      if (employeeId) {
        await activityLogService.logActivity({
          employeeId: employeeId,
          action: 'email',
          targetType: 'buyer',
          targetId: buyer.buyer_number,
          metadata: {
            template_type: templateType || '不明',
            subject: subject,
            body: content, // 本文全体を保存
            recipient_email: to,
            sender_email: (req as any).employee?.email || 'unknown',
            selected_images: selectedImages?.length || 0,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        console.log('[POST /buyers/:id/send-email] Activity log recorded successfully');
      } else {
        console.warn('[POST /buyers/:id/send-email] Skipping activity log: No employee_id available');
      }
    } catch (logError: any) {
      // ログ記録失敗してもメール送信は成功として扱う
      console.error('[POST /buyers/:id/send-email] Failed to log email activity:', logError);
    }

    console.log('[POST /buyers/:id/send-email] Email sent successfully:', result.messageId);

    res.json({
      success: true,
      message: 'メールを送信しました',
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('[POST /buyers/:id/send-email] Exception:', error);
    console.error('[POST /buyers/:id/send-email] Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message || 'メール送信に失敗しました',
      details: error.toString(),
    });
  }
});

// 買主へのSMS送信記録
router.post('/:id/send-sms', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, templateType } = req.body;

    // バリデーション
    if (!message) {
      return res.status(400).json({ error: 'メッセージは必須です' });
    }

    // 買主情報を取得
    const buyer = await buyerService.getByBuyerNumber(id);
    if (!buyer) {
      return res.status(404).json({ error: '買主が見つかりません' });
    }

    // SMS送信記録をアクティビティログに保存
    try {
      const { ActivityLogService } = require('../services/ActivityLogService');
      const activityLogService = new ActivityLogService();
      
      // employee_idがない場合はログを記録しない（UUIDが必須のため）
      const employeeId = (req as any).employee?.id;
      if (employeeId) {
        await activityLogService.logActivity({
          employeeId: employeeId,
          action: 'sms',
          targetType: 'buyer',
          targetId: buyer.buyer_number,
          metadata: {
            template_type: templateType || '不明',
            message: message,
            recipient_phone: buyer.phone_number,
            sender: (req as any).employee?.name || 'unknown',
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        console.log('SMS activity log recorded successfully for buyer:', id);
      } else {
        console.warn('Skipping SMS activity log: No employee_id available');
      }
    } catch (logError: any) {
      // ログ記録失敗してもSMS送信は成功として扱う
      console.error('Failed to log SMS activity:', logError);
    }

    console.log('Recording SMS to buyer:', {
      buyerNumber: id,
      phoneNumber: buyer.phone_number,
      message: message.substring(0, 100) + '...',
    });

    res.json({
      success: true,
      message: 'SMS送信を記録しました',
    });
  } catch (error: any) {
    console.error('Failed to record SMS:', error);
    res.status(500).json({ error: error.message || 'SMS送信記録に失敗しました' });
  }
});

// 買付チャット送信
router.post('/:buyer_number/send-offer-chat', async (req: Request, res: Response) => {
  try {
    const { buyer_number } = req.params;
    const { propertyNumber, offerComment } = req.body;

    console.log('[POST /buyers/:buyer_number/send-offer-chat] Request received:', {
      buyer_number,
      propertyNumber,
      offerCommentLength: offerComment?.length || 0,
    });

    // バリデーション
    if (!propertyNumber) {
      console.error('[POST /buyers/:buyer_number/send-offer-chat] Validation failed: propertyNumber is required');
      return res.status(400).json({
        success: false,
        error: '物件番号は必須です',
      });
    }

    // 1. 買主データを取得
    const buyer = await buyerService.getByBuyerNumber(buyer_number);
    if (!buyer) {
      console.error('[POST /buyers/:buyer_number/send-offer-chat] Buyer not found:', buyer_number);
      return res.status(404).json({
        success: false,
        error: '買主が見つかりませんでした',
      });
    }

    console.log('[POST /buyers/:buyer_number/send-offer-chat] Buyer found:', {
      buyer_number: buyer.buyer_number,
      name: buyer.name,
      latest_status: buyer.latest_status,
    });

    // 2. 物件データを取得（property_listingsテーブルから）
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();
    
    if (propertyError || !property) {
      console.error('[POST /buyers/:buyer_number/send-offer-chat] Property not found:', propertyNumber, propertyError);
      return res.status(404).json({
        success: false,
        error: '物件が見つかりませんでした',
      });
    }

    console.log('[POST /buyers/:buyer_number/send-offer-chat] Property found:', {
      property_number: property.property_number,
      address: property.address,
      atbb_status: property.atbb_status,
    });

    // 3. GoogleChatServiceを使用してメッセージ送信
    const { GoogleChatService } = require('../services/GoogleChatService');
    const chatService = new GoogleChatService();
    
    await chatService.sendOfferMessage(buyer, property, offerComment || '');

    console.log('[POST /buyers/:buyer_number/send-offer-chat] Message sent successfully');

    // 成功レスポンス
    res.json({
      success: true,
      message: 'Google Chatに送信しました',
    });

  } catch (error: any) {
    console.error('[POST /buyers/:buyer_number/send-offer-chat] Exception:', error);
    console.error('[POST /buyers/:buyer_number/send-offer-chat] Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message || 'チャット送信に失敗しました',
    });
  }
});

// 担当への確認事項をGoogle Chatに送信
router.post('/:buyer_number/send-confirmation', async (req: Request, res: Response) => {
  try {
    const { buyer_number } = req.params;
    const { confirmationText, buyerDetailUrl } = req.body;

    console.log('[POST /buyers/:buyer_number/send-confirmation] Request received:', {
      buyer_number,
      confirmationTextLength: confirmationText?.length || 0,
      buyerDetailUrl
    });

    // バリデーション: confirmationTextが空または未定義
    if (!confirmationText || confirmationText.trim().length === 0) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] Validation failed: confirmationText is empty');
      return res.status(400).json({
        success: false,
        error: '確認事項を入力してください'
      });
    }

    // 1. buyer_numberで買主を取得
    const buyer = await buyerService.getByBuyerNumber(buyer_number);
    if (!buyer) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] Buyer not found:', buyer_number);
      return res.status(404).json({
        success: false,
        error: '買主が見つかりませんでした'
      });
    }

    console.log('[POST /buyers/:buyer_number/send-confirmation] Buyer found:', {
      buyer_number: buyer.buyer_number,
      name: buyer.name,
      property_number: buyer.property_number
    });

    // 2. property_numberが存在するか確認
    if (!buyer.property_number || buyer.property_number.trim().length === 0) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] property_number is empty');
      return res.status(400).json({
        success: false,
        error: '物件番号が設定されていません'
      });
    }

    // 3. 紐づく物件を取得
    const properties = await buyerService.getLinkedProperties(buyer.buyer_id);
    if (!properties || properties.length === 0) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] No linked properties found');
      return res.status(400).json({
        success: false,
        error: '紐づく物件が見つかりませんでした'
      });
    }

    console.log('[POST /buyers/:buyer_number/send-confirmation] Linked properties found:', {
      count: properties.length,
      first_property: properties[0].property_number
    });

    // 4. sales_assigneeが存在するか確認
    const firstProperty = properties[0];
    if (!firstProperty.sales_assignee || firstProperty.sales_assignee.trim().length === 0) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] sales_assignee is empty');
      return res.status(400).json({
        success: false,
        error: '物件担当者が設定されていません'
      });
    }

    const assigneeName = firstProperty.sales_assignee;
    console.log('[POST /buyers/:buyer_number/send-confirmation] Assignee name:', assigneeName);

    // 5. StaffManagementService.getWebhookUrl()でWebhook URLを取得
    const { StaffManagementService } = require('../services/StaffManagementService');
    const staffService = new StaffManagementService();
    
    const webhookResult = await staffService.getWebhookUrl(assigneeName);
    
    if (!webhookResult.success) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] Failed to get webhook URL:', webhookResult.error);
      return res.status(404).json({
        success: false,
        error: webhookResult.error || '担当者のWebhook URLが取得できませんでした'
      });
    }

    const webhookUrl = webhookResult.webhookUrl!;
    console.log('[POST /buyers/:buyer_number/send-confirmation] Webhook URL retrieved');

    // 6. メッセージをフォーマット
    // 価格のフォーマット（万円表示）
    // property_listingsテーブルのpriceフィールドを使用
    const price = firstProperty.price || firstProperty.sales_price || firstProperty.listing_price;
    const priceFormatted = price 
      ? `${(price / 10000).toLocaleString()}万円`
      : '未設定';
    
    console.log('[POST /buyers/:buyer_number/send-confirmation] Price data:', {
      price: firstProperty.price,
      sales_price: firstProperty.sales_price,
      listing_price: firstProperty.listing_price,
      formatted: priceFormatted
    });
    
    // 買主詳細画面のURL（フロントエンドから送信されたURL、またはフォールバック）
    const detailUrl = buyerDetailUrl || `https://www.appsheet.com/start/8f0d5296-d256-411a-9a64-a13f2e034d8f#view=%E8%B2%B7%E4%B8%BB%E3%83%AA%E3%82%B9%E3%83%88_Detail&row=${buyer.buyer_number}`;
    
    // メッセージを構築（法人名と仲介の有無は条件付き表示）
    let message = `問合せありました: 
　【初動担当】${buyer.initial_assignee || '未設定'}【連絡先】${buyer.assignee_phone || '未設定'}
【物件所在地】 ${firstProperty.display_address || firstProperty.address || '未設定'}
【価格】${priceFormatted}
【★問合せ内容】${confirmationText}
 【問合せ者氏名】${buyer.name || '未設定'}`;

    // 法人名がある場合のみ追加
    if (buyer.company_name && buyer.company_name.trim().length > 0) {
      message += `\n【法人の場合法人名】${buyer.company_name}`;
      // 仲介の有無も追加（法人の場合のみ）
      if (buyer.broker_inquiry && buyer.broker_inquiry.trim().length > 0) {
        message += `\n【仲介の有無】${buyer.broker_inquiry}`;
      }
    }

    message += `\n【問合せ者電話番号】 ${buyer.phone_number || '未設定'}
${detailUrl}`;

    console.log('[POST /buyers/:buyer_number/send-confirmation] Message formatted');

    // 7. GoogleChatService.sendMessage()でメッセージ送信
    const { GoogleChatService } = require('../services/GoogleChatService');
    const chatService = new GoogleChatService();
    
    const sendResult = await chatService.sendMessage(webhookUrl, message);
    
    if (!sendResult.success) {
      console.error('[POST /buyers/:buyer_number/send-confirmation] Failed to send message:', sendResult.error);
      return res.status(500).json({
        success: false,
        error: sendResult.error || 'メッセージの送信に失敗しました'
      });
    }

    console.log('[POST /buyers/:buyer_number/send-confirmation] Message sent successfully');

    // 成功レスポンス
    res.json({
      success: true,
      message: '送信しました'
    });

  } catch (error: any) {
    console.error('[POST /buyers/:buyer_number/send-confirmation] Exception:', error);
    console.error('[POST /buyers/:buyer_number/send-confirmation] Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: `メッセージの送信に失敗しました: ${error.message}`
    });
  }
});

// 買主を論理削除
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).employee?.id || 'manual';
    
    // UUIDかどうかで判定
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 買主番号を取得
    let buyerNumber: string;
    if (isUuid) {
      const buyer = await buyerService.getById(id);
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      buyerNumber = buyer.buyer_number;
    } else {
      buyerNumber = id;
    }
    
    // EnhancedAutoSyncServiceを使用して論理削除
    await enhancedAutoSyncService.initializeBuyer();
    const result = await (enhancedAutoSyncService as any).executeBuyerSoftDelete(buyerNumber);
    
    if (result.success) {
      res.json({ 
        success: true, 
        deletedAt: result.deletedAt,
        message: `Buyer ${buyerNumber} deleted successfully`
      });
    } else {
      res.status(500).json({ 
        error: result.error || 'Failed to delete buyer'
      });
    }
  } catch (error: any) {
    console.error('Error deleting buyer:', error);
    res.status(500).json({ error: error.message });
  }
});

// 削除された買主を復元
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).employee?.id || 'manual';
    
    // UUIDかどうかで判定
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 買主番号を取得
    let buyerNumber: string;
    if (isUuid) {
      const buyer = await buyerService.getByBuyerNumber(id, true); // includeDeleted=true
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      buyerNumber = buyer.buyer_number;
    } else {
      buyerNumber = id;
    }
    
    // EnhancedAutoSyncServiceを使用して復元
    await enhancedAutoSyncService.initializeBuyer();
    const result = await (enhancedAutoSyncService as any).recoverDeletedBuyer(buyerNumber, userId);
    
    if (result.success) {
      res.json({ 
        success: true, 
        recoveredAt: result.recoveredAt,
        message: `Buyer ${buyerNumber} restored successfully`
      });
    } else {
      res.status(500).json({ 
        error: result.error || 'Failed to restore buyer'
      });
    }
  } catch (error: any) {
    console.error('Error restoring buyer:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
