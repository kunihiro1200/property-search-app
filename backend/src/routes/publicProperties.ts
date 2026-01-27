// 公開物件サイト用のAPIルート
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { PropertyListingService } from '../services/PropertyListingService';
import { PropertyImageService } from '../services/PropertyImageService';
import { WorkTaskService } from '../services/WorkTaskService';
import { RecommendedCommentService } from '../services/RecommendedCommentService';
import { FavoriteCommentService } from '../services/FavoriteCommentService';
import { AthomeDataService } from '../services/AthomeDataService';
// import { InquirySyncService } from '../services/InquirySyncService'; // 動的インポートに変更
import { PropertyService } from '../services/PropertyService';
import { PanoramaUrlService } from '../services/PanoramaUrlService';
import { createRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Supabase クライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const propertyListingService = new PropertyListingService();

// PropertyImageServiceの設定を環境変数から読み込む
const folderIdCacheTTLMinutes = parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10);
const searchTimeoutSeconds = parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10);
const maxSubfoldersToSearch = parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10);

const propertyImageService = new PropertyImageService(
  60, // cacheTTLMinutes（画像キャッシュ）
  folderIdCacheTTLMinutes,
  searchTimeoutSeconds,
  maxSubfoldersToSearch
);

const workTaskService = new WorkTaskService();
const recommendedCommentService = new RecommendedCommentService();
const favoriteCommentService = new FavoriteCommentService();
const athomeDataService = new AthomeDataService();
const propertyService = new PropertyService();
const panoramaUrlService = new PanoramaUrlService();

// InquirySyncServiceのインスタンス化（遅延初期化 + 動的インポート）
let inquirySyncService: any = null;

// InquirySyncServiceを取得（必要な時だけ初期化）
const getInquirySyncService = async () => {
  if (!inquirySyncService) {
    const { InquirySyncService } = await import('../services/InquirySyncService');
    inquirySyncService = new InquirySyncService({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      maxRetries: 3,
      retryDelayMs: 1000,
    });
  }
  return inquirySyncService;
};

// Rate limiter: 20 requests per hour per IP for inquiries (テスト用に緩和)
const inquiryRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20
});

// Inquiry validation schema
const inquirySchema = z.object({
  name: z.string().min(1, '名前を入力してください').max(100, '名前は100文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().min(1, '電話番号を入力してください').max(20, '電話番号は20文字以内で入力してください'),
  message: z.string().min(1, 'メッセージを入力してください').max(1000, 'メッセージは1000文字以内で入力してください'),
  propertyId: z.string().uuid('無効な物件IDです').optional()
});

// 公開物件一覧取得
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const {
      limit = '20',
      offset = '0',
      propertyType,
      types, // 新しいパラメータ名
      minPrice,
      maxPrice,
      areas,
      location,
      minAge,
      maxAge,
      propertyNumber,
      showPublicOnly, // 公開中のみ表示フィルター
      withCoordinates, // 座標がある物件のみ取得（地図表示用）
    } = req.query;

    // パラメータのバリデーション
    const parsedLimit = Math.min(parseInt(limit as string, 10), 2000); // 最大2000件
    const parsedOffset = parseInt(offset as string, 10);

    // 価格範囲のバリデーション
    // フロントエンドから送られてくる価格は「万円」単位なので、「円」単位に変換（10000倍）
    let priceFilter: { min?: number; max?: number } | undefined;
    if (minPrice || maxPrice) {
      priceFilter = {};
      if (minPrice) {
        const min = parseInt(minPrice as string, 10);
        if (!isNaN(min) && min >= 0) {
          priceFilter.min = min * 10000; // 万円 → 円に変換
        }
      }
      if (maxPrice) {
        const max = parseInt(maxPrice as string, 10);
        if (!isNaN(max) && max >= 0) {
          priceFilter.max = max * 10000; // 万円 → 円に変換
        }
      }
    }

    // 物件タイプのマッピング（英語→日本語）
    const propertyTypeMapping: Record<string, string> = {
      'land': '土地',
      'detached_house': '戸建',
      'apartment': 'マンション',
      'income': '収益物件',
      'other': 'その他'
    };
    
    let propertyTypeFilter: string[] | undefined;
    // typesパラメータを優先、なければpropertyTypeを使用（後方互換性）
    const typeParam = types || propertyType;
    if (typeParam && typeof typeParam === 'string') {
      // カンマ区切りの複数タイプをサポート
      const typeList = typeParam.split(',').map(t => t.trim()).filter(t => t);
      propertyTypeFilter = typeList.map(type => propertyTypeMapping[type] || type);
    }

    // エリアフィルタのパース
    let areaFilter: string[] | undefined;
    if (areas && typeof areas === 'string') {
      areaFilter = areas.split(',').map(a => a.trim()).filter(a => a);
    }

    // 所在地フィルタのバリデーション
    let locationFilter: string | undefined;
    if (location && typeof location === 'string') {
      locationFilter = location.trim();
    }

    // 物件番号フィルタのバリデーション
    let propertyNumberFilter: string | undefined;
    if (propertyNumber && typeof propertyNumber === 'string') {
      propertyNumberFilter = propertyNumber.trim();
    }

    // 築年数範囲のバリデーション
    let buildingAgeRange: { min?: number; max?: number } | undefined;
    if (minAge || maxAge) {
      buildingAgeRange = {};
      
      if (minAge) {
        const min = parseInt(minAge as string, 10);
        if (isNaN(min) || min < 0) {
          res.status(400).json({ 
            error: 'Invalid minAge parameter',
            message: '最小築年数は0以上の数値を指定してください' 
          });
          return;
        }
        buildingAgeRange.min = min;
      }
      
      if (maxAge) {
        const max = parseInt(maxAge as string, 10);
        if (isNaN(max) || max < 0) {
          res.status(400).json({ 
            error: 'Invalid maxAge parameter',
            message: '最大築年数は0以上の数値を指定してください' 
          });
          return;
        }
        buildingAgeRange.max = max;
      }

      // 範囲の妥当性チェック
      if (buildingAgeRange.min !== undefined && 
          buildingAgeRange.max !== undefined && 
          buildingAgeRange.min > buildingAgeRange.max) {
        res.status(400).json({ 
          error: 'Invalid age range',
          message: '最小築年数は最大築年数以下である必要があります' 
        });
        return;
      }
    }

    const result = await propertyListingService.getPublicProperties({
      limit: parsedLimit,
      offset: parsedOffset,
      propertyType: propertyTypeFilter,
      priceRange: priceFilter,
      areas: areaFilter,
      location: locationFilter,
      propertyNumber: propertyNumberFilter,
      buildingAgeRange: buildingAgeRange,
      showPublicOnly: showPublicOnly === 'true', // 公開中のみ表示フィルター
      withCoordinates: withCoordinates === 'true', // 座標がある物件のみ取得（地図表示用）
    });

    // フィルタメタデータを含めてレスポンス
    const response = {
      properties: result.properties,
      pagination: result.pagination,
      filters: {
        propertyType: typeParam || null,
        priceRange: priceFilter || null,
        areas: areaFilter || null,
        location: locationFilter || null,
        propertyNumber: propertyNumberFilter || null,
        buildingAgeRange: buildingAgeRange || null,
      }
    };

    // キャッシュヘッダーを設定（5分間）
    res.set('Cache-Control', 'public, max-age=300');
    res.json(response);
  } catch (error: any) {
    console.error('Error fetching public properties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 物件詳細の全データを一度に取得（パフォーマンス最適化）
// ⚠️ 重要: このルートは /properties/:identifier より前に定義する必要があります
router.get('/properties/:id/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log(`[GET /api/public/properties/${id}/complete] Fetching complete property data`);
    
    // 物件情報を取得（property_detailsテーブルのデータも含まれる）
    const property = await propertyListingService.getPublicPropertyById(id);
    
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }
    
    console.log(`[Complete API] Property data retrieved for: ${property.property_number}`);
    console.log(`[Complete API] Has favorite_comment: ${!!property.favorite_comment}`);
    console.log(`[Complete API] Has recommended_comments: ${!!property.recommended_comments}`);
    console.log(`[Complete API] Has athome_data: ${!!property.athome_data}`);
    console.log(`[Complete API] Has property_about: ${!!property.property_about}`);
    
    // 決済日を取得（成約済みの場合のみ）
    let settlementDate = null;
    const isSold = property.atbb_status === '成約済み' || property.atbb_status === 'sold';
    if (isSold) {
      try {
        settlementDate = await propertyService.getSettlementDate(property.property_number);
      } catch (err) {
        console.error('[Complete API] Settlement date error:', err);
      }
    }
    
    // レスポンスを返す（getPublicPropertyByIdが既に取得したデータを使用）
    // キャッシュヘッダーを設定（5分間）
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      property,
      favoriteComment: property.favorite_comment,
      recommendedComments: property.recommended_comments,
      athomeData: property.athome_data,
      settlementDate,
      propertyAbout: property.property_about
    });
    
  } catch (error: any) {
    console.error('[GET /api/public/properties/:id/complete] Error:', error);
    res.status(500).json({ message: 'Failed to fetch complete property data' });
  }
});

// 公開物件詳細取得（物件番号またはUUIDで取得）
router.get('/properties/:identifier', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;

    // UUIDの形式かどうかをチェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(identifier);

    let property;
    
    if (isUUID) {
      // UUIDの場合は既存のメソッドを使用
      property = await propertyListingService.getPublicPropertyById(identifier);
    } else {
      // 物件番号の場合は物件番号で検索
      property = await propertyListingService.getPublicPropertyByNumber(identifier);
    }

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    // キャッシュヘッダーを設定（10分間）
    res.set('Cache-Control', 'public, max-age=600');
    res.json({ success: true, property });
  } catch (error: any) {
    console.error('Error fetching public property:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 決済日取得（物件番号で取得）
router.get('/properties/:propertyNumber/settlement-date', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    
    // 決済日を取得
    const settlementDate = await propertyService.getSettlementDate(propertyNumber);

    // キャッシュヘッダーを設定（10分間）
    res.set('Cache-Control', 'public, max-age=600');
    res.json({ settlementDate });
  } catch (error: any) {
    console.error('Error fetching settlement date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// BQ列データ取得（物件番号で取得）
router.get('/properties/:propertyNumber/about', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    
    // BQ列データを取得
    const about = await propertyService.getPropertyAbout(propertyNumber);

    // キャッシュヘッダーを設定（10分間）
    res.set('Cache-Control', 'public, max-age=600');
    res.json({ about });
  } catch (error: any) {
    console.error('Error fetching property about:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 概算書PDF生成（物件番号で生成）
router.post('/properties/:propertyNumber/estimate-pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    
    // 概算書PDFを生成
    const pdfUrl = await propertyService.generateEstimatePdf(propertyNumber);

    res.json({ pdfUrl });
  } catch (error: any) {
    console.error('Error generating estimate PDF:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || '概算書の生成に失敗しました'
    });
  }
});

// おすすめコメント取得
router.get('/properties/:id/recommended-comment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 物件情報を取得
    const property = await propertyListingService.getPublicPropertyById(id);
    
    if (!property) {
      res.status(404).json({
        error: 'Property not found or not publicly available'
      });
      return;
    }
    
    // おすすめコメントを取得（propertyIdも渡してキャッシュを有効化）
    const result = await recommendedCommentService.getRecommendedComment(
      property.property_number,
      property.property_type,
      id
    );
    
    // キャッシュヘッダーを設定（5分間）
    res.set('Cache-Control', 'public, max-age=300');
    res.json(result);
  } catch (error: any) {
    console.error('[PublicProperties] Error fetching recommended comment:', error);
    // エラー時もグレースフルデグラデーション
    res.status(200).json({
      comments: [],
      propertyType: 'unknown',
      error: error.message
    });
  }
});

// お気に入り文言取得
router.get('/properties/:id/favorite-comment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // お気に入り文言を取得
    const result = await favoriteCommentService.getFavoriteComment(id);
    
    // キャッシュヘッダーを設定（5分間）
    res.set('Cache-Control', 'public, max-age=300');
    res.json(result);
  } catch (error: any) {
    console.error('[PublicProperties] Error fetching favorite comment:', error);
    // エラー時もグレースフルデグラデーション
    res.status(200).json({
      comment: null,
      propertyType: 'unknown',
      error: error.message
    });
  }
});

// コメント診断エンドポイント（両方のコメント機能の状態を一度に確認）
router.get('/properties/:id/comments-diagnostic', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const startTime = Date.now();
    
    // 物件情報を取得
    const property = await propertyListingService.getPublicPropertyById(id);
    
    if (!property) {
      res.status(404).json({
        error: 'Property not found',
        propertyId: id,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // お気に入り文言を取得
    const favoriteCommentStart = Date.now();
    const favoriteComment = await favoriteCommentService.getFavoriteComment(id);
    const favoriteCommentTime = Date.now() - favoriteCommentStart;
    
    // アピールポイントを取得
    const recommendedCommentStart = Date.now();
    const recommendedComment = await recommendedCommentService.getRecommendedComment(
      property.property_number,
      property.property_type,
      id
    );
    const recommendedCommentTime = Date.now() - recommendedCommentStart;
    
    // スプレッドシートURL取得
    let spreadsheetUrl = property.storage_location;
    if (!spreadsheetUrl || !spreadsheetUrl.includes('/spreadsheets/d/')) {
      const workTask = await workTaskService.getByPropertyNumber(property.property_number);
      spreadsheetUrl = (workTask as any)?.spreadsheet_url;
    }
    
    // セル位置/範囲の決定
    const cellPositionMap: Record<string, string> = {
      '土地': 'B53',
      '戸建て': 'B142',
      '戸建': 'B142',
      'マンション': 'B150',
      'land': 'B53',
      'detached_house': 'B142',
      'apartment': 'B150',
    };
    
    const cellRangeMap: Record<string, string> = {
      '土地': 'B63:L79',
      '戸建て': 'B152:L166',
      '戸建': 'B152:L166',
      'マンション': 'B149:L163',
      'land': 'B63:L79',
      'detached_house': 'B152:L166',
      'apartment': 'B149:L163',
    };
    
    const cellPosition = cellPositionMap[property.property_type] || null;
    const cellRange = cellRangeMap[property.property_type] || null;
    
    // 診断結果
    const diagnostic = {
      propertyId: id,
      propertyNumber: property.property_number,
      propertyType: property.property_type,
      spreadsheetUrl: spreadsheetUrl || null,
      favoriteComment: {
        cellPosition,
        value: favoriteComment.comment,
        hasValue: !!favoriteComment.comment,
        responseTime: favoriteCommentTime,
        error: null
      },
      recommendedComment: {
        cellRange,
        rowCount: recommendedComment.comments.length,
        totalCells: recommendedComment.comments.reduce((sum, row) => sum + row.length, 0),
        hasValue: recommendedComment.comments.length > 0,
        responseTime: recommendedCommentTime,
        error: null
      },
      totalResponseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
    
    res.json(diagnostic);
  } catch (error: any) {
    console.error('[PublicProperties] Error in comments diagnostic:', error);
    res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Athomeデータ取得
router.get('/properties/:id/athome', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 物件情報を取得
    const property = await propertyListingService.getPublicPropertyById(id);
    
    if (!property) {
      res.status(404).json({
        error: 'Property not found or not publicly available'
      });
      return;
    }
    
    // Athomeデータを取得
    const result = await athomeDataService.getAthomeData(
      property.property_number,
      property.property_type,
      property.storage_location
    );
    
    // キャッシュヘッダーを設定（5分間）
    res.set('Cache-Control', 'public, max-age=300');
    res.json(result);
  } catch (error: any) {
    console.error('[PublicProperties] Error fetching athome data:', error);
    // エラー時もグレースフルデグラデーション
    res.status(200).json({
      data: [],
      propertyType: 'unknown',
      cached: false,
      error: error.message
    });
  }
});

// 物件画像一覧取得（格納先URLから）
router.get('/properties/:id/images', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { includeHidden = 'false' } = req.query;

    // UUIDの形式かどうかをチェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(id);

    // 物件情報を取得
    let property;
    if (isUUID) {
      property = await propertyListingService.getPublicPropertyById(id);
    } else {
      property = await propertyListingService.getPublicPropertyByNumber(id);
    }

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    // storage_locationを優先的に使用
    let storageUrl = property.storage_location;
    
    // storage_locationが空の場合、property.athome_dataから取得
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      // athome_dataの最初の要素がフォルダURL
      storageUrl = property.athome_data[0];
      console.log(`[Images API] Using athome_data as storage_url: ${storageUrl}`);
    }

    // 格納先URLから画像を取得
    const result = await propertyImageService.getImagesFromStorageUrl(storageUrl, property.property_number);

    // 非表示画像リストを取得（UUIDを使用）
    const hiddenImages = await propertyListingService.getHiddenImages(property.id);

    // includeHiddenがfalseの場合、非表示画像をフィルタリング
    let filteredImages = result.images;
    if (includeHidden !== 'true' && hiddenImages.length > 0) {
      filteredImages = result.images.filter(img => !hiddenImages.includes(img.id));
    }

    // キャッシュヘッダーを設定（1時間）
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      ...result,
      images: filteredImages,
      totalCount: result.images.length,
      visibleCount: filteredImages.length,
      hiddenCount: hiddenImages.length,
      hiddenImages: includeHidden === 'true' ? hiddenImages : undefined
    });
  } catch (error: any) {
    console.error('Error fetching property images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 画像プロキシ（CORS対策）- OPTIONSリクエスト対応
router.options('/images/:fileId', (req: Request, res: Response): void => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).send();
});

router.options('/images/:fileId/thumbnail', (req: Request, res: Response): void => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).send();
});

// 画像プロキシ（CORS対策）- フル画像
router.get('/images/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    // CORSヘッダーを最初に設定
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Credentials', 'false');

    const imageData = await propertyImageService.getImageData(fileId);

    if (!imageData) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    
    // キャッシュヘッダーを設定（1日）
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Type', imageData.mimeType);
    res.send(imageData.buffer);
  } catch (error: any) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 画像プロキシ（CORS対策）- サムネイル
router.get('/images/:fileId/thumbnail', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    // CORSヘッダーを最初に設定
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Credentials', 'false');

    // サムネイルも同じ画像データを使用（Google Drive APIのサムネイルは認証が必要なため）
    const imageData = await propertyImageService.getImageData(fileId);

    if (!imageData) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    
    // キャッシュヘッダーを設定（1日）
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Type', imageData.mimeType);
    res.send(imageData.buffer);
  } catch (error: any) {
    console.error('Error fetching thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 画像削除（認証必須）
router.delete('/properties/:propertyId/images/:imageId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId, imageId } = req.params;

    // パラメータバリデーション
    if (!propertyId || !imageId) {
      res.status(400).json({ 
        success: false,
        error: 'propertyIdとimageIdは必須です' 
      });
      return;
    }

    // UUIDバリデーション（propertyId）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      res.status(400).json({ 
        success: false,
        error: '無効な物件IDです' 
      });
      return;
    }

    // 物件情報を取得
    const property = await propertyListingService.getPublicPropertyById(propertyId);
    if (!property) {
      res.status(404).json({ 
        success: false,
        error: '物件が見つかりません' 
      });
      return;
    }

    // storage_locationを優先的に使用し、なければwork_tasksテーブルからstorage_urlを取得
    let storageUrl = property.storage_location;
    
    if (!storageUrl) {
      const workTask = await workTaskService.getByPropertyNumber(property.property_number);
      storageUrl = workTask?.storage_url;
    }

    if (!storageUrl) {
      res.status(404).json({ 
        success: false,
        error: '物件の格納先URLが設定されていません' 
      });
      return;
    }

    // 削除実行ユーザーIDとIPアドレスを取得
    const deletedBy = req.employee?.id || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;

    // 画像を削除
    const result = await propertyImageService.deleteImage(
      imageId,
      propertyId,
      storageUrl,
      deletedBy,
      ipAddress
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        imageId: result.imageId,
        imageName: result.imageName,
      });
    } else {
      // 画像が見つからない場合は404
      if (result.message.includes('見つからない')) {
        res.status(404).json({
          success: false,
          error: result.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message,
        });
      }
    }
  } catch (error: any) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      success: false,
      error: '画像の削除に失敗しました。しばらく時間をおいて再度お試しください。' 
    });
  }
});

// 問い合わせ送信
router.post('/inquiries', inquiryRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validationResult = inquirySchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({ 
        success: false,
        message: '入力内容に誤りがあります',
        errors: validationResult.error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    const { name, email, phone, message, propertyId } = validationResult.data;

    // Get client IP address
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    let property = null;
    let propertyNumber = null;
    
    // 物件IDが指定されている場合のみ物件情報を取得
    if (propertyId) {
      console.log(`[Inquiry] Fetching property with ID: ${propertyId}`);
      
      // PropertyListingServiceを使用して物件情報を取得
      const propertyData = await propertyListingService.getPublicPropertyById(propertyId);
      
      if (!propertyData) {
        console.error(`[Inquiry] Property not found: ${propertyId}`);
        res.status(404).json({
          success: false,
          message: '指定された物件が見つかりません'
        });
        return;
      }
      
      console.log(`[Inquiry] Property found: ${propertyData.property_number}`);
      property = {
        property_number: propertyData.property_number,
        site_display: propertyData.site_display,
        athome_public_folder_id: propertyData.athome_public_folder_id
      };
      propertyNumber = propertyData.property_number;
    }

    // 直接買主リストに転記（property_inquiriesテーブルをバイパス）
    try {
      console.log('[Inquiry] Starting sync to buyer sheet...');
      
      // InquirySyncServiceを取得（必要な時だけ初期化）
      const syncService = await getInquirySyncService();
      console.log('[Inquiry] InquirySyncService obtained');
      
      await syncService.authenticate();
      console.log('[Inquiry] Authentication successful');
      
      // 買主番号を採番
      const allRows = await syncService['sheetsClient'].readAll();
      console.log(`[Inquiry] Read ${allRows.length} rows from sheet`);
      
      const columnEValues = allRows
        .map(row => row['買主番号'])
        .filter(value => value !== null && value !== undefined)
        .map(value => String(value));
      
      const maxNumber = columnEValues.length > 0
        ? Math.max(...columnEValues.map(v => parseInt(v) || 0))
        : 0;
      const buyerNumber = maxNumber + 1;
      console.log(`[Inquiry] Generated buyer number: ${buyerNumber}`);

      // フィールドマッピング（正しいカラム名を使用）
      const normalizedPhone = phone.replace(/[^0-9]/g, ''); // 数字のみ抽出
      
      // 問合せ元の判定: 公開物件サイトからの問い合わせは「いふう独自サイト」
      const inquirySource = 'いふう独自サイト';

      const rowData = {
        '買主番号': buyerNumber.toString(),
        '●氏名・会社名': name,
        '●問合時ヒアリング': message,
        '●電話番号\n（ハイフン不要）': normalizedPhone,
        '●メアド': email,
        '●問合せ元': inquirySource,
        '物件番号': propertyNumber || '', // 物件番号がない場合は空文字
        '【問合メール】電話対応': '未', // CS列に「未」を設定
      };
      
      console.log('[Inquiry] Row data prepared:', JSON.stringify(rowData, null, 2));

      // スプレッドシートに直接追加
      await syncService['sheetsClient'].appendRow(rowData);
      console.log('[Inquiry] Row appended successfully');

      console.log('Inquiry synced to buyer sheet:', {
        buyerNumber,
        propertyNumber: propertyNumber || '(none)',
        customerName: name
      });

    } catch (syncError) {
      // 転記エラーはログに記録するが、ユーザーには成功を返す
      console.error('Failed to sync inquiry to buyer sheet:', syncError);
      console.error('Error stack:', (syncError as Error).stack);
    }

    res.status(201).json({ 
      success: true,
      message: 'お問い合わせを受け付けました。担当者より折り返しご連絡いたします。'
    });
  } catch (error: any) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({ 
      success: false,
      message: 'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。'
    });
  }
});

// 物件番号検索（社内用・認証必須）
router.get('/internal/properties/search', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber, exact = 'false' } = req.query;

    // パラメータバリデーション
    if (!propertyNumber || typeof propertyNumber !== 'string') {
      res.status(400).json({ 
        error: 'Property number is required',
        message: '物件番号を指定してください' 
      });
      return;
    }

    const trimmedNumber = propertyNumber.trim();
    if (!trimmedNumber) {
      res.status(400).json({ 
        error: 'Property number cannot be empty',
        message: '物件番号を入力してください' 
      });
      return;
    }

    // 完全一致/部分一致の判定
    const isExactMatch = exact === 'true';

    // 検索実行
    const results = await propertyListingService.searchByPropertyNumber(
      trimmedNumber,
      isExactMatch
    );

    res.json({ 
      properties: results, 
      count: results.length,
      searchTerm: trimmedNumber,
      exactMatch: isExactMatch
    });
  } catch (error: any) {
    console.error('Error searching properties by number:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '物件番号検索に失敗しました' 
    });
  }
});

// サイトマップ生成
router.get('/sitemap', async (_req: Request, res: Response) => {
  try {
    const properties = await propertyListingService.getAllPublicPropertyIds();

    // XML形式のサイトマップを生成
    const baseUrl = process.env.PUBLIC_SITE_URL || 'https://example.com';
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${properties.map(id => `  <url>
    <loc>${baseUrl}/properties/${id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ
    res.send(sitemap);
  } catch (error: any) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 格納先URL自動取得（認証必須）
router.post('/properties/:propertyNumber/retrieve-storage-url', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    
    console.log(`[POST /api/public/properties/${propertyNumber}/retrieve-storage-url] Starting...`);
    
    // Google Driveから格納先URLを自動取得
    const storageUrl = await propertyService.retrieveStorageUrl(propertyNumber);
    
    if (storageUrl) {
      res.json({ 
        success: true,
        storageUrl,
        message: '格納先URLを自動取得しました'
      });
    } else {
      res.status(404).json({ 
        success: false,
        message: '画像フォルダが見つかりませんでした。物件番号のフォルダがGoogle Driveに存在するか確認してください。'
      });
    }
  } catch (error: any) {
    console.error('[POST /api/public/properties/:propertyNumber/retrieve-storage-url] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message || '格納先URLの取得に失敗しました'
    });
  }
});

// 格納先URL手動更新（認証必須）
router.put('/properties/:propertyNumber/storage-url', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    const { storageUrl } = req.body;
    
    console.log(`[PUT /api/public/properties/${propertyNumber}/storage-url] Starting...`);
    
    // バリデーション
    if (!storageUrl || typeof storageUrl !== 'string') {
      res.status(400).json({ 
        success: false,
        message: '格納先URLを入力してください'
      });
      return;
    }
    
    // URLフォーマットの簡易チェック
    if (!storageUrl.includes('drive.google.com')) {
      res.status(400).json({ 
        success: false,
        message: '有効なGoogle DriveのURLを入力してください'
      });
      return;
    }
    
    // データベースを更新
    const success = await propertyService.updateStorageUrl(propertyNumber, storageUrl);
    
    if (success) {
      res.json({ 
        success: true,
        storageUrl,
        message: '格納先URLを更新しました'
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: '格納先URLの更新に失敗しました'
      });
    }
  } catch (error: any) {
    console.error('[PUT /api/public/properties/:propertyNumber/storage-url] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message || '格納先URLの更新に失敗しました'
    });
  }
});

// パノラマURL取得
router.get('/properties/:propertyNumber/panorama-url', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    
    console.log(`[GET /api/public/properties/${propertyNumber}/panorama-url] Fetching panorama URL`);
    
    // パノラマURLを取得
    const panoramaUrl = await panoramaUrlService.getPanoramaUrl(propertyNumber);
    
    if (panoramaUrl) {
      console.log(`[GET /api/public/properties/${propertyNumber}/panorama-url] Found panorama URL`);
      res.json({
        success: true,
        panoramaUrl,
      });
    } else {
      console.log(`[GET /api/public/properties/${propertyNumber}/panorama-url] No panorama URL found`);
      res.json({
        success: true,
        panoramaUrl: null,
      });
    }
  } catch (error: any) {
    console.error(`[GET /api/public/properties/:propertyNumber/panorama-url] Error:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'パノラマURLの取得に失敗しました',
    });
  }
});

// 環境変数診断エンドポイント（開発用）
router.get('/debug/env-check', async (_req: Request, res: Response): Promise<void> => {
  try {
    const envCheck = {
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabase_service_key: !!process.env.SUPABASE_SERVICE_KEY,
      node_env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };
    
    res.json(envCheck);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// データベース接続テスト（開発用）
router.get('/debug/db-test/:propertyNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    const { PropertyDetailsService } = await import('../services/PropertyDetailsService');
    const service = new PropertyDetailsService();
    
    const details = await service.getPropertyDetails(propertyNumber);
    
    res.json({
      success: true,
      propertyNumber,
      hasData: {
        property_about: !!details.property_about,
        recommended_comments: !!details.recommended_comments,
        athome_data: !!details.athome_data,
        favorite_comment: !!details.favorite_comment
      },
      details
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// 画像キャッシュクリア（特定物件）
router.post('/properties/:identifier/clear-image-cache', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    
    console.log(`🗑️ Clearing image cache for: ${identifier}`);

    // UUIDの形式かどうかをチェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(identifier);

    // 物件情報を取得
    let property;
    if (isUUID) {
      property = await propertyListingService.getPublicPropertyById(identifier);
    } else {
      property = await propertyListingService.getPublicPropertyByNumber(identifier);
    }

    if (!property) {
      console.error(`❌ Property not found: ${identifier}`);
      res.status(404).json({ 
        success: false,
        error: 'Property not found' 
      });
      return;
    }

    console.log(`✅ Found property: ${property.property_number} (${property.id})`);

    // storage_locationを取得
    let storageUrl = property.storage_location;
    
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      storageUrl = property.athome_data[0];
    }

    if (!storageUrl) {
      console.error(`❌ No storage URL found for property: ${identifier}`);
      res.status(404).json({ 
        success: false,
        error: 'Storage URL not found',
        message: '画像の格納先URLが設定されていません'
      });
      return;
    }

    // フォルダIDを抽出（親フォルダ）
    console.log(`🔍 Extracting folder ID from storage URL: ${storageUrl}`);
    const parentFolderId = propertyImageService.extractFolderIdFromUrl(storageUrl);
    console.log(`🔍 Extracted parent folder ID: ${parentFolderId}`);
    
    if (!parentFolderId) {
      console.error(`❌ Could not extract folder ID from storage URL: ${storageUrl}`);
      res.status(400).json({ 
        success: false,
        error: 'Invalid storage URL',
        message: '格納先URLからフォルダIDを抽出できませんでした',
        details: {
          storageUrl: storageUrl,
          extractedId: parentFolderId
        }
      });
      return;
    }

    // 画像表示時と同じロジックで実際のフォルダIDを取得
    // （athome公開フォルダが存在する場合はそのID、なければ親フォルダID）
    const result = await propertyImageService.getImagesFromStorageUrl(storageUrl, property.property_number);
    const actualFolderId = result.folderId || parentFolderId;
    
    console.log(`📁 Parent folder ID: ${parentFolderId}`);
    console.log(`📁 Actual folder ID (used for images): ${actualFolderId}`);
    
    // 実際に使われているフォルダのキャッシュをクリア
    propertyImageService.clearCache(actualFolderId);
    console.log(`✅ Image cache cleared for folder: ${actualFolderId}`);
    
    res.json({
      success: true,
      message: `物件 ${property.property_number} の画像キャッシュをクリアしました`,
      propertyNumber: property.property_number,
      parentFolderId: parentFolderId,
      actualFolderId: actualFolderId
    });
  } catch (error: any) {
    console.error('❌ Error clearing image cache:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    });
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to clear image cache'
    });
  }
});

// 全物件の画像キャッシュをクリア
router.post('/clear-all-image-cache', async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log(`🗑️ Clearing all image cache`);

    // 全キャッシュをクリア
    propertyImageService.clearCache();
    console.log(`✅ All image cache cleared`);
    
    res.json({
      success: true,
      message: '全ての画像キャッシュをクリアしました'
    });
  } catch (error: any) {
    console.error('❌ Error clearing all image cache:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to clear all image cache'
    });
  }
});

// 画像・基本情報を更新（軽量版）
router.post('/properties/:identifier/refresh-essential', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    
    console.log(`[Refresh Essential] Request for property: ${identifier}`);
    
    // UUIDの形式かどうかをチェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(identifier);
    
    // 物件情報を取得（データベース）
    let property;
    if (isUUID) {
      property = await propertyListingService.getPublicPropertyById(identifier);
    } else {
      property = await propertyListingService.getPublicPropertyByNumber(identifier);
    }
    
    if (!property) {
      console.log(`[Refresh Essential] Property not found: ${identifier}`);
      res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
      return;
    }
    
    console.log(`[Refresh Essential] Property found: ${property.property_number}`);
    
    // storage_locationを取得
    let storageUrl = property.storage_location;
    
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      storageUrl = property.athome_data[0];
    }
    
    let images = [];
    let newImageUrl: string | null = null;
    
    if (storageUrl) {
      // キャッシュをクリアしてから画像を取得
      const folderId = propertyImageService.extractFolderIdFromUrl(storageUrl);
      if (folderId) {
        propertyImageService.clearCache(folderId);
      }
      
      const result = await propertyImageService.getImagesFromStorageUrl(storageUrl, property.property_number);
      
      // 非表示画像をフィルタリング
      const hiddenImages = await propertyListingService.getHiddenImages(property.id);
      images = result.images.filter(img => !hiddenImages.includes(img.id));
      
      console.log(`[Refresh Essential] Images fetched: ${images.length} images`);
      
      // 最初の画像のURLを取得（データベース更新用）
      if (images.length > 0) {
        newImageUrl = images[0].url;
        console.log(`[Refresh Essential] First image URL: ${newImageUrl}`);
        
        // データベースのimage_urlを更新（永続化）
        const { error: updateError } = await supabase
          .from('property_listings')
          .update({ 
            image_url: newImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', property.id);
        
        if (updateError) {
          console.error('[Refresh Essential] Failed to update image_url:', updateError);
        } else {
          console.log(`[Refresh Essential] ✅ Updated image_url in database: ${newImageUrl}`);
        }
      }
    } else {
      console.log(`[Refresh Essential] No storage URL found`);
    }
    
    res.json({
      success: true,
      data: {
        property,
        images
      },
      message: '画像と基本情報を更新しました（データベースにも保存しました）'
    });
  } catch (error: any) {
    console.error('[Refresh Essential] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '更新に失敗しました'
    });
  }
});

// 全て更新（完全版）
router.post('/properties/:identifier/refresh-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    
    console.log(`[Refresh All] Request for property: ${identifier}`);
    
    // UUIDの形式かどうかをチェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(identifier);
    
    // 物件情報を取得
    let property;
    if (isUUID) {
      property = await propertyListingService.getPublicPropertyById(identifier);
    } else {
      property = await propertyListingService.getPublicPropertyByNumber(identifier);
    }
    
    if (!property) {
      console.log(`[Refresh All] Property not found: ${identifier}`);
      res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
      return;
    }
    
    console.log(`[Refresh All] Property found: ${property.property_number}`);
    
    // 全てのデータを並列取得（キャッシュをバイパス）
    const startTime = Date.now();
    
    // storage_locationを取得
    let storageUrl = property.storage_location;
    
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      storageUrl = property.athome_data[0];
    }
    
    // 画像取得
    let images = [];
    let newImageUrl: string | null = null;
    
    if (storageUrl) {
      const folderId = propertyImageService.extractFolderIdFromUrl(storageUrl);
      if (folderId) {
        propertyImageService.clearCache(folderId);
      }
      
      const result = await propertyImageService.getImagesFromStorageUrl(storageUrl, property.property_number);
      const hiddenImages = await propertyListingService.getHiddenImages(property.id);
      images = result.images.filter(img => !hiddenImages.includes(img.id));
      
      // 最初の画像のURLを取得（データベース更新用）
      if (images.length > 0) {
        newImageUrl = images[0].url;
        console.log(`[Refresh All] First image URL: ${newImageUrl}`);
        
        // データベースのimage_urlを更新（永続化）
        const { error: updateError } = await supabase
          .from('property_listings')
          .update({ 
            image_url: newImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', property.id);
        
        if (updateError) {
          console.error('[Refresh All] Failed to update image_url:', updateError);
        } else {
          console.log(`[Refresh All] ✅ Updated image_url in database: ${newImageUrl}`);
        }
      }
    }
    
    // コメントデータを並列取得
    const [favoriteComment, recommendedComment, athomeData] = await Promise.all([
      favoriteCommentService.getFavoriteComment(property.id).catch(err => {
        console.error('[Refresh All] Favorite comment error:', err);
        return { comment: null };
      }),
      recommendedCommentService.getRecommendedComment(
        property.property_number,
        property.property_type,
        property.id
      ).catch(err => {
        console.error('[Refresh All] Recommended comment error:', err);
        return { comments: [] };
      }),
      athomeDataService.getAthomeData(
        property.property_number,
        property.property_type,
        storageUrl
      ).catch(err => {
        console.error('[Refresh All] Athome data error:', err);
        return { data: [] };
      })
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`[Refresh All] All data fetched in ${duration}ms`);
    
    res.json({
      success: true,
      data: {
        property,
        images,
        favoriteComment: favoriteComment.comment,
        recommendedComments: recommendedComment.comments,
        athomeData: athomeData.data
      },
      message: '全てのデータを更新しました（データベースにも保存しました）',
      duration
    });
  } catch (error: any) {
    console.error('[Refresh All] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '更新に失敗しました'
    });
  }
});

// 格納先URL更新（認証不要 - 公開サイトのエンドポイント）
router.post('/properties/:identifier/update-storage-url', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    const { storageUrl } = req.body;
    
    console.log(`[Update Storage URL] Request for property: ${identifier}`);
    console.log(`[Update Storage URL] New storage URL: ${storageUrl}`);
    
    if (!storageUrl || typeof storageUrl !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid storage URL',
        message: '有効なGoogle DriveフォルダURLを入力してください'
      });
      return;
    }
    
    // UUIDの形式かどうかをチェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(identifier);
    
    // 物件情報を取得
    let property;
    if (isUUID) {
      property = await propertyListingService.getPublicPropertyById(identifier);
    } else {
      property = await propertyListingService.getPublicPropertyByNumber(identifier);
    }
    
    if (!property) {
      console.log(`[Update Storage URL] Property not found: ${identifier}`);
      res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
      return;
    }
    
    // storage_locationを更新（Supabaseクライアントを直接使用）
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({ storage_location: storageUrl })
      .eq('id', property.id);
    
    if (updateError) {
      console.error('[Update Storage URL] Database error:', updateError);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'データベースの更新に失敗しました'
      });
      return;
    }
    
    console.log(`[Update Storage URL] Successfully updated storage_location for ${property.property_number}`);
    
    res.json({
      success: true,
      message: '格納先URLを更新しました'
    });
  } catch (error: any) {
    console.error('[Update Storage URL] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '更新に失敗しました'
    });
  }
});

export default router;
