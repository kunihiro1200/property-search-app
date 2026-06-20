// 物件リストのAPIルート
import { Router, Request, Response } from 'express';
import { PropertyListingService } from '../services/PropertyListingService';
import { BuyerLinkageService } from '../services/BuyerLinkageService';
import { BuyerLinkageCache } from '../services/BuyerLinkageCache';
import { BuyerDistributionService } from '../services/BuyerDistributionService';
import { EnhancedBuyerDistributionService } from '../services/EnhancedBuyerDistributionService';
import { DataIntegrityDiagnosticService } from '../services/DataIntegrityDiagnosticService';
import { BuyerCandidateService } from '../services/BuyerCandidateService';
import { UrlValidator } from '../utils/urlValidator';

const router = Router();
const propertyListingService = new PropertyListingService();
const buyerLinkageService = new BuyerLinkageService();
const buyerLinkageCache = new BuyerLinkageCache();
const buyerDistributionService = new BuyerDistributionService();
const enhancedBuyerDistributionService = new EnhancedBuyerDistributionService();
const diagnosticService = new DataIntegrityDiagnosticService();
const buyerCandidateService = new BuyerCandidateService();

// 一覧取得
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      limit = '50',
      offset = '0',
      orderBy = 'created_at',
      orderDirection = 'desc',
      search,
      status,
      salesAssignee,
      propertyType,
    } = req.query;

    const result = await propertyListingService.getAll({
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      orderBy: orderBy as string,
      orderDirection: orderDirection as 'asc' | 'desc',
      search: search as string,
      status: status as string,
      salesAssignee: salesAssignee as string,
      propertyType: propertyType as string,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching property listings:', error);
    res.status(500).json({ error: error.message });
  }
});

// 統計取得
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await propertyListingService.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// 公開物件一覧取得（公開物件サイト用）
router.get('/public', async (req: Request, res: Response) => {
  try {
    const {
      limit = '20',
      offset = '0',
      propertyType,
      priceMin,
      priceMax,
      areas,
      location,
      propertyNumber,
      buildingAgeMin,
      buildingAgeMax,
    } = req.query;

    // propertyTypeが配列の場合とカンマ区切りの文字列の場合に対応
    let propertyTypeArray: string[] | undefined;
    if (propertyType) {
      if (Array.isArray(propertyType)) {
        propertyTypeArray = propertyType as string[];
      } else if (typeof propertyType === 'string') {
        propertyTypeArray = propertyType.split(',').map(t => t.trim());
      }
    }

    // areasが配列の場合とカンマ区切りの文字列の場合に対応
    let areasArray: string[] | undefined;
    if (areas) {
      if (Array.isArray(areas)) {
        areasArray = areas as string[];
      } else if (typeof areas === 'string') {
        areasArray = areas.split(',').map(a => a.trim());
      }
    }

    const result = await propertyListingService.getPublicProperties({
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      propertyType: propertyTypeArray,
      priceRange: {
        min: priceMin ? parseInt(priceMin as string, 10) : undefined,
        max: priceMax ? parseInt(priceMax as string, 10) : undefined,
      },
      areas: areasArray,
      location: location as string,
      propertyNumber: propertyNumber as string,
      buildingAgeRange: {
        min: buildingAgeMin ? parseInt(buildingAgeMin as string, 10) : undefined,
        max: buildingAgeMax ? parseInt(buildingAgeMax as string, 10) : undefined,
      },
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching public properties:', error);
    res.status(500).json({ error: error.message });
  }
});

// 個別取得
router.get('/:propertyNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    const data = await propertyListingService.getByPropertyNumber(propertyNumber);
    
    if (!data) {
      res.status(404).json({ error: 'Property listing not found' });
      return;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching property listing:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新
router.put('/:propertyNumber', async (req: Request, res: Response) => {
  try {
    const { propertyNumber } = req.params;
    const updates = req.body;

    // Validate distribution_areas if provided
    if (updates.distribution_areas !== undefined && updates.distribution_areas !== null) {
      const { PropertyDistributionAreaCalculator } = await import('../services/PropertyDistributionAreaCalculator');
      const calculator = new PropertyDistributionAreaCalculator();
      
      if (!calculator.validateAreaNumbers(updates.distribution_areas)) {
        return res.status(400).json({ 
          error: 'Invalid distribution_areas format. Must contain only valid area numbers (①-⑯, ㊵, ㊶)' 
        });
      }
    }

    const data = await propertyListingService.update(propertyNumber, updates);
    res.json(data);
  } catch (error: any) {
    console.error('Error updating property listing:', error);
    res.status(500).json({ error: error.message });
  }
});

// 複数物件の買主カウント取得
router.get('/buyer-counts/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumbers } = req.query;

    if (!propertyNumbers || typeof propertyNumbers !== 'string') {
      res.status(400).json({ error: 'propertyNumbers query parameter is required' });
      return;
    }

    const propNumArray = propertyNumbers.split(',').map(n => n.trim()).filter(n => n);

    if (propNumArray.length === 0) {
      res.json({});
      return;
    }

    // キャッシュチェック
    const counts: Record<string, number> = {};
    const uncachedNumbers: string[] = [];

    for (const propNum of propNumArray) {
      const cached = await buyerLinkageCache.getBuyerCount(propNum);
      if (cached !== null) {
        counts[propNum] = cached;
      } else {
        uncachedNumbers.push(propNum);
      }
    }

    // 未キャッシュのものを取得
    if (uncachedNumbers.length > 0) {
      const fetchedCounts = await buyerLinkageService.getBuyerCountsForProperties(uncachedNumbers);
      
      for (const [propNum, count] of fetchedCounts.entries()) {
        counts[propNum] = count;
        await buyerLinkageCache.setBuyerCount(propNum, count);
      }
    }

    res.json(counts);
  } catch (error: any) {
    console.error('Error fetching buyer counts:', error);
    res.status(500).json({ error: error.message });
  }
});

// 特定物件の買主リスト取得
router.get('/:propertyNumber/buyers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    const { sortBy, sortOrder, limit } = req.query;

    // キャッシュチェック
    const cached = await buyerLinkageCache.getBuyerList(propertyNumber);
    if (cached) {
      res.json(cached);
      return;
    }

    const buyers = await buyerLinkageService.getBuyersForProperty(propertyNumber, {
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      limit: limit ? parseInt(limit as string, 10) : undefined
    });

    // キャッシュに保存
    await buyerLinkageCache.setBuyerList(propertyNumber, buyers);

    res.json(buyers);
  } catch (error: any) {
    console.error('Error fetching buyers for property:', error);
    res.status(500).json({ error: error.message });
  }
});

// 買主候補リスト取得（条件に合致する買主を抽出）
router.get('/:propertyNumber/buyer-candidates', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;

    console.log(`[buyer-candidates] Fetching candidates for property: ${propertyNumber}`);

    const result = await buyerCandidateService.getCandidatesForProperty(propertyNumber);

    console.log(`[buyer-candidates] Found ${result.total} candidates for property: ${propertyNumber}`);

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching buyer candidates:', error);

    if (error.message === 'Property not found') {
      res.status(404).json({
        error: 'Property not found',
        code: 'PROPERTY_NOT_FOUND'
      });
      return;
    }

    res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

// 高確度買主を持つ物件リスト取得
router.get('/high-confidence-buyers/list', async (_req: Request, res: Response) => {
  try {
    const propertyNumbers = await buyerLinkageService.getPropertiesWithHighConfidenceBuyers();
    res.json(propertyNumbers);
  } catch (error: any) {
    console.error('Error fetching high confidence properties:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gmail配信用の買主メールアドレス取得
router.get('/:propertyNumber/distribution-buyers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    const { includeRadius = 'true' } = req.query;

    const result = await buyerDistributionService.getQualifiedBuyers({
      propertyNumber,
      includeRadiusFilter: includeRadius === 'true'
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching distribution buyers:', error);
    
    if (error.message.includes('Property not found')) {
      res.status(404).json({ 
        error: 'Property not found',
        code: 'PROPERTY_NOT_FOUND'
      });
      return;
    }

    res.status(500).json({ 
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

// Gmail配信用の買主メールアドレス取得（拡張版 - 複数条件フィルタリング）
router.get('/:propertyNumber/distribution-buyers-enhanced', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { propertyNumber } = req.params;
    const { includeDetails = 'false' } = req.query;

    console.log(`[${requestId}] Request received: GET /api/property-listings/${propertyNumber}/distribution-buyers-enhanced`, {
      includeDetails,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']
    });

    // パラメータバリデーション
    if (!propertyNumber || typeof propertyNumber !== 'string' || propertyNumber.trim() === '') {
      console.warn(`[${requestId}] Invalid property number parameter: ${propertyNumber}`);
      res.status(400).json({ 
        error: 'Invalid property number',
        code: 'INVALID_PARAMETER',
        message: 'Property number must be a non-empty string'
      });
      return;
    }

    // includeDetailsパラメータのバリデーション
    if (includeDetails && typeof includeDetails !== 'string') {
      console.warn(`[${requestId}] Invalid includeDetails parameter: ${includeDetails}`);
      res.status(400).json({ 
        error: 'Invalid includeDetails parameter',
        code: 'INVALID_PARAMETER',
        message: 'includeDetails must be "true" or "false"'
      });
      return;
    }

    console.log(`[${requestId}] Fetching enhanced distribution buyers for property: ${propertyNumber}`);

    // 拡張フィルタリングサービスを使用
    const result = await enhancedBuyerDistributionService.getQualifiedBuyersWithAllCriteria({
      propertyNumber
    });

    const duration = Date.now() - startTime;

    // includeDetailsがfalseの場合、詳細情報を除外
    if (includeDetails !== 'true') {
      const { filteredBuyers, ...rest } = result;
      console.log(`[${requestId}] Success: Returning ${rest.emails.length} qualified buyer emails (without details)`, {
        duration: `${duration}ms`,
        totalBuyers: rest.totalBuyers,
        qualifiedCount: rest.count
      });
      res.json(rest);
      return;
    }

    console.log(`[${requestId}] Success: Returning ${result.emails.length} qualified buyer emails (with details)`, {
      duration: `${duration}ms`,
      totalBuyers: result.totalBuyers,
      qualifiedCount: result.count
    });
    res.json(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error fetching enhanced distribution buyers:`, {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      propertyNumber: req.params.propertyNumber
    });
    
    // エラータイプに応じた適切なレスポンス
    if (error.code === 'PROPERTY_NOT_FOUND' || error.message.includes('Property not found') || error.message.includes('not found')) {
      console.warn(`[${requestId}] Property not found: ${req.params.propertyNumber}`);
      
      // Run diagnostics to provide helpful information
      try {
        const diagnostic = await diagnosticService.diagnoseProperty(req.params.propertyNumber);
        
        console.log(`[${requestId}] Diagnostic result:`, {
          propertyNumber: req.params.propertyNumber,
          existsInSellers: diagnostic.existsInSellers,
          existsInPropertyListings: diagnostic.existsInPropertyListings,
          syncStatus: diagnostic.syncStatus
        });
        
        res.status(404).json({ 
          error: 'Property not found',
          code: 'PROPERTY_NOT_FOUND',
          message: `Property with number ${req.params.propertyNumber} does not exist in property_listings`,
          propertyNumber: req.params.propertyNumber,
          diagnostics: {
            existsInSellers: diagnostic.existsInSellers,
            canBeRecovered: diagnostic.existsInSellers && !diagnostic.existsInPropertyListings,
            syncStatus: diagnostic.syncStatus
          }
        });
      } catch (diagError: any) {
        console.error(`[${requestId}] Failed to run diagnostics:`, diagError);
        res.status(404).json({ 
          error: 'Property not found',
          code: 'PROPERTY_NOT_FOUND',
          message: `Property with number ${req.params.propertyNumber} does not exist`,
          propertyNumber: req.params.propertyNumber
        });
      }
      return;
    }

    if (error.message.includes('Invalid') || error.message.includes('validation')) {
      console.warn(`[${requestId}] Validation error: ${error.message}`);
      res.status(400).json({ 
        error: 'Invalid request parameters',
        code: 'INVALID_PARAMETER',
        message: error.message
      });
      return;
    }

    // データベース接続エラー
    if (error.message.includes('database') || error.message.includes('connection')) {
      console.error(`[${requestId}] Database error: ${error.message}`);
      res.status(503).json({ 
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection error. Please try again later.'
      });
      return;
    }

    // その他のサーバーエラー
    console.error(`[${requestId}] Internal server error: ${error.message}`, error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 物件配信メールを一括送信
 */
router.post('/:propertyNumber/send-distribution-emails', async (req: Request, res: Response) => {
  try {
    const { propertyNumber } = req.params;
    const { recipientEmails, subject, content, htmlBody, from } = req.body;

    // バリデーション
    if (!recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return res.status(400).json({
        error: 'recipientEmails is required and must be a non-empty array'
      });
    }

    if (!subject || !content) {
      return res.status(400).json({
        error: 'subject and content are required'
      });
    }

    if (!from) {
      return res.status(400).json({
        error: 'from (sender address) is required'
      });
    }

    // 物件情報を取得
    const property = await propertyListingService.getByPropertyNumber(propertyNumber);
    if (!property) {
      return res.status(404).json({
        error: 'Property listing not found'
      });
    }

    // EmailServiceをインポート
    const { EmailService } = await import('../services/EmailService.supabase');
    const emailService = new EmailService();

    // 各受信者にメールを送信
    const results = await Promise.allSettled(
      recipientEmails.map(async (email: string) => {
        // ダミーのseller objectを作成（EmailServiceのインターフェースに合わせる）
        const dummySeller = {
          id: property.id,
          seller_number: propertyNumber,
          name: '買主様',
          email: email,
          phone_number: '',
          property_address: property.property_address || '',
          created_at: new Date(),
          updated_at: new Date()
        };

        return await emailService.sendTemplateEmail(
          dummySeller as any,
          subject,
          content,
          from,
          req.employee?.id || 'system',
          htmlBody,
          from
        );
      })
    );

    // 成功・失敗をカウント
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failedCount = results.length - successCount;

    // 失敗したメールのエラーメッセージを収集
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason?.message || 'Unknown error')
      .join(', ');

    const failedResults = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !r.value.success)
      .map(r => r.value.error || 'Unknown error')
      .join(', ');

    const allErrors = [errors, failedResults].filter(e => e).join(', ');

    res.json({
      success: failedCount === 0,
      successCount,
      failedCount,
      totalCount: recipientEmails.length,
      error: failedCount > 0 ? allErrors : undefined
    });
  } catch (error: any) {
    console.error('Error sending distribution emails:', error);
    res.status(500).json({
      error: error.message || 'Failed to send distribution emails',
      success: false,
      successCount: 0,
      failedCount: req.body.recipientEmails?.length || 0
    });
  }
});



// 非表示画像リストを取得
router.get('/:id/hidden-images', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const hiddenImages = await propertyListingService.getHiddenImages(id);

    res.json({
      hiddenImages,
      count: hiddenImages.length
    });
  } catch (error: any) {
    console.error('Error fetching hidden images:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

// 画像一覧を取得（非表示画像を除外）
router.get('/:id/images', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const images = await propertyListingService.getVisibleImages(id);

    res.json({
      images,
      count: images.length
    });
  } catch (error: any) {
    console.error('Error fetching images:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

// 画像を非表示にする
router.post('/:id/hide-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fileId } = req.body;

    if (!fileId) {
      res.status(400).json({ 
        error: 'fileId is required',
        code: 'MISSING_FILE_ID'
      });
      return;
    }

    await propertyListingService.hideImage(id, fileId);

    res.json({
      success: true,
      message: `Image ${fileId} has been hidden`
    });
  } catch (error: any) {
    console.error('Error hiding image:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

// 画像を復元する（非表示を解除）
router.post('/:id/unhide-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fileId } = req.body;

    if (!fileId) {
      res.status(400).json({ 
        error: 'fileId is required',
        code: 'MISSING_FILE_ID'
      });
      return;
    }

    await propertyListingService.unhideImage(id, fileId);

    res.json({
      success: true,
      message: `Image ${fileId} has been unhidden`
    });
  } catch (error: any) {
    console.error('Error unhiding image:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

// Google Map URLを更新
router.patch('/:propertyNumber/google-map-url', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    const { googleMapUrl } = req.body;

    // Validate URL
    if (!UrlValidator.validateGoogleMapUrl(googleMapUrl)) {
      res.status(400).json({
        error: '有効なGoogle Map URLを入力してください'
      });
      return;
    }

    // Sanitize URL
    const sanitizedUrl = UrlValidator.sanitizeUrl(googleMapUrl);

    // Update property
    const updatedProperty = await propertyListingService.update(propertyNumber, {
      google_map_url: sanitizedUrl
    });

    res.json({
      success: true,
      distributionAreas: updatedProperty.distribution_areas
    });
  } catch (error: any) {
    console.error('Error updating Google Map URL:', error);
    res.status(500).json({ error: 'Failed to update Google Map URL' });
  }
});

// Storage Locationを更新
router.patch('/:propertyNumber/storage-location', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    const { storageLocation } = req.body;

    // Validate URL
    if (!UrlValidator.validateGoogleDriveFolderUrl(storageLocation)) {
      res.status(400).json({
        error: '有効なGoogle DriveフォルダURLを入力してください'
      });
      return;
    }

    // Sanitize URL
    const sanitizedUrl = UrlValidator.sanitizeUrl(storageLocation);

    // Update property
    await propertyListingService.update(propertyNumber, {
      storage_location: sanitizedUrl
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating Storage Location:', error);
    res.status(500).json({ error: 'Failed to update Storage Location' });
  }
});

export default router;
