// 公開物件サイト専用のエントリーポイント
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';
import { PropertyListingService } from '../src/services/PropertyListingService';
import { PropertyImageService } from '../src/services/PropertyImageService';
import { GoogleDriveService } from '../src/services/GoogleDriveService';
import { PropertyDetailsService } from '../src/services/PropertyDetailsService';
import { PropertyService } from '../src/services/PropertyService';
import { PanoramaUrlService } from '../src/services/PanoramaUrlService';
import publicPropertiesRoutes from '../src/routes/publicProperties';

const app = express();

// 環境変数のデバッグログ
console.log('🔍 Environment variables check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? `Set (${process.env.SUPABASE_SERVICE_KEY.length} chars)` : 'Missing',
  GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? `Set (${process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length} chars)` : 'Missing',
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'Not set',
  NODE_ENV: process.env.NODE_ENV || 'Not set',
});

// Supabase クライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PropertyListingServiceの初期化（ローカル環境と同じ）
const propertyListingService = new PropertyListingService();

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // 公開サイトなので全てのオリジンを許可
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// テスト用：publicPropertiesRoutesが読み込めているか確認
app.get('/api/test/routes', (_req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'publicPropertiesRoutes is now active',
    timestamp: new Date().toISOString() 
  });
});

// ⚠️ 重要: publicPropertiesRoutes を先に登録（より具体的なルートを優先）
// app.use('/api/public', publicPropertiesRoutes); // 一時的にコメントアウト（ルートの重複を回避）

// 公開物件一覧取得（全ての物件を取得、atbb_statusはバッジ表示用）
app.get('/api/public/properties', async (req, res) => {
  try {
    console.log('🔍 Fetching properties from database...');
    
    // クエリパラメータを取得
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const propertyNumber = req.query.propertyNumber as string;
    const location = req.query.location as string;
    const types = req.query.types as string;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const minAge = req.query.minAge ? parseInt(req.query.minAge as string) : undefined;
    const maxAge = req.query.maxAge ? parseInt(req.query.maxAge as string) : undefined;
    const showPublicOnly = req.query.showPublicOnly === 'true';
    const withCoordinates = req.query.withCoordinates === 'true'; // 座標がある物件のみ取得
    const skipImages = req.query.skipImages === 'true'; // 画像取得をスキップ（地図ビュー用）
    
    console.log('📊 Query params:', { limit, offset, propertyNumber, location, types, minPrice, maxPrice, minAge, maxAge, showPublicOnly, withCoordinates, skipImages });
    
    // 価格範囲のバリデーション
    let priceFilter: { min?: number; max?: number } | undefined;
    if (minPrice !== undefined || maxPrice !== undefined) {
      priceFilter = {};
      if (minPrice !== undefined) {
        priceFilter.min = minPrice * 10000; // 万円を円に変換
      }
      if (maxPrice !== undefined) {
        priceFilter.max = maxPrice * 10000; // 万円を円に変換
      }
    }
    
    // 物件タイプフィルター
    let propertyTypeFilter: string[] | undefined;
    if (types) {
      propertyTypeFilter = types.split(',');
    }
    
    // 築年数範囲のバリデーション
    let buildingAgeRange: { min?: number; max?: number } | undefined;
    if (minAge !== undefined || maxAge !== undefined) {
      buildingAgeRange = {};
      if (minAge !== undefined) {
        buildingAgeRange.min = minAge;
      }
      if (maxAge !== undefined) {
        buildingAgeRange.max = maxAge;
      }
    }
    
    // PropertyListingServiceを使用（ローカル環境と同じ）
    const result = await propertyListingService.getPublicProperties({
      limit,
      offset,
      propertyType: propertyTypeFilter,
      priceRange: priceFilter,
      location,
      propertyNumber,
      buildingAgeRange,
      showPublicOnly,
      withCoordinates, // 座標がある物件のみ取得
      skipImages, // 画像取得をスキップ（地図ビュー用）
    });

    console.log(`✅ Found ${result.properties?.length || 0} properties (total: ${result.pagination.total})`);

    res.json({ 
      success: true, 
      properties: result.properties || [],
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('❌ Error fetching properties:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch properties',
      details: 'Failed to fetch properties from database',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 公開物件詳細取得（atbb_statusでフィルタリングしない）
app.get('/api/public/properties/:propertyIdentifier', async (req, res) => {
  try {
    const { propertyIdentifier } = req.params;
    console.log(`🔍 Fetching property details for: ${propertyIdentifier}`);
    
    // UUIDか物件番号かを判定（UUIDは36文字のハイフン付き形式）
    const isUuid = propertyIdentifier.length === 36 && propertyIdentifier.includes('-');
    
    // データベースから物件詳細を取得（atbb_statusでフィルタリングしない）
    let query = supabase
      .from('property_listings')
      .select('*');
    
    if (isUuid) {
      query = query.eq('id', propertyIdentifier);
    } else {
      query = query.eq('property_number', propertyIdentifier);
    }
    
    const { data: property, error } = await query.single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    if (!property) {
      return res.status(404).json({ 
        success: false, 
        error: 'Property not found'
      });
    }

    console.log(`✅ Found property: ${propertyIdentifier} (${property.property_number})`);

    // image_urlをimagesに変換（JSON配列または単一文字列に対応）
    let images = [];
    if (property.image_url) {
      try {
        // JSON配列としてパースを試みる
        images = JSON.parse(property.image_url);
      } catch (e) {
        // パースに失敗した場合は単一の文字列として扱う
        // 空文字列でない場合のみ配列に追加
        if (property.image_url.trim()) {
          images = [property.image_url];
        }
      }
    }

    res.json({ 
      success: true, 
      property: {
        ...property,
        images
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching property details:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Failed to fetch property details from database'
    });
  }
});

// 公開物件の完全な詳細情報取得（物件番号またはUUIDで取得）
app.get('/api/public/properties/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[Complete API] Fetching complete data for: ${id}`);
    
    // 物件情報を取得
    const property = await propertyListingService.getPublicPropertyById(id);
    
    if (!property) {
      console.error(`[Complete API] Property not found: ${id}`);
      return res.status(404).json({ message: 'Property not found' });
    }
    
    console.log(`[Complete API] Found property: ${property.property_number}`);
    
    // PropertyDetailsServiceを使用（静的インポート）
    const propertyDetailsService = new PropertyDetailsService();

    let dbDetails;
    try {
      dbDetails = await propertyDetailsService.getPropertyDetails(property.property_number);
      console.log(`[Complete API] PropertyDetailsService returned:`, {
        has_favorite_comment: !!dbDetails.favorite_comment,
        has_recommended_comments: !!dbDetails.recommended_comments,
        has_athome_data: !!dbDetails.athome_data,
        has_property_about: !!dbDetails.property_about
      });
    } catch (error: any) {
      console.error(`[Complete API] Error calling PropertyDetailsService:`, error);
      dbDetails = {
        property_number: property.property_number,
        favorite_comment: null,
        recommended_comments: null,
        athome_data: null,
        property_about: null
      };
    }

    // 決済日を取得（成約済みの場合のみ）
    let settlementDate = null;
    const isSold = property.atbb_status === '成約済み' || property.atbb_status === 'sold';
    if (isSold) {
      try {
        const propertyService = new PropertyService();
        settlementDate = await propertyService.getSettlementDate(property.property_number);
      } catch (err) {
        console.error('[Complete API] Settlement date error:', err);
      }
    }

    // パノラマURLを取得
    let panoramaUrl = null;
    try {
      const panoramaUrlService = new PanoramaUrlService();
      panoramaUrl = await panoramaUrlService.getPanoramaUrl(property.property_number);
      console.log(`[Complete API] Panorama URL: ${panoramaUrl || '(not found)'}`);
    } catch (err) {
      console.error('[Complete API] Panorama URL error:', err);
    }

    // レスポンスを返す
    res.json({
      property,
      favoriteComment: dbDetails.favorite_comment,
      recommendedComments: dbDetails.recommended_comments,
      athomeData: dbDetails.athome_data,
      settlementDate,
      propertyAbout: dbDetails.property_about,
      panoramaUrl,
    });
    
  } catch (error: any) {
    console.error('[Complete API] Error:', error);
    console.error('[Complete API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({ 
      message: 'Failed to fetch complete property data',
      error: error.message 
    });
  }
});

// 物件番号ベースの画像一覧取得エンドポイント（publicPropertiesRoutesの代替）
app.get('/api/public/properties/:identifier/images', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { includeHidden = 'false' } = req.query;
    
    console.log(`🖼️ Fetching images for: ${identifier}`);

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
      return res.status(404).json({ error: 'Property not found' });
    }

    console.log(`✅ Found property: ${property.property_number} (${property.id})`);

    // storage_locationを優先的に使用
    let storageUrl = property.storage_location;
    
    // storage_locationが空の場合、property.athome_dataから取得
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      // athome_dataの最初の要素がフォルダURL
      storageUrl = property.athome_data[0];
      console.log(`[Images API] Using athome_data as storage_url: ${storageUrl}`);
    }

    if (!storageUrl) {
      console.error(`❌ No storage URL found for property: ${identifier}`);
      return res.status(404).json({ 
        error: 'Storage URL not found',
        message: '画像の格納先URLが設定されていません'
      });
    }

    // PropertyImageServiceを使用して画像を取得
    const propertyImageService = new PropertyImageService(
      60, // cacheTTLMinutes
      parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10),
      parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10),
      parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10)
    );

    const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);

    // 非表示画像リストを取得
    const hiddenImages = await propertyListingService.getHiddenImages(property.id);

    // includeHiddenがfalseの場合、非表示画像をフィルタリング
    let filteredImages = result.images;
    if (includeHidden !== 'true' && hiddenImages.length > 0) {
      filteredImages = result.images.filter(img => !hiddenImages.includes(img.id));
    }

    console.log(`✅ Found ${filteredImages.length} images (${hiddenImages.length} hidden)`);

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
    console.error('❌ Error fetching property images:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to fetch images'
    });
  }
});

// 画像プロキシエンドポイント（Google Driveの画像をバックエンド経由で取得）
// サムネイル用
app.get('/api/public/images/:fileId/thumbnail', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    console.log(`🖼️ Proxying thumbnail image: ${fileId}`);
    
    // GoogleDriveServiceを使用して画像データを取得
    const driveService = new GoogleDriveService();
    
    const imageData = await driveService.getImageData(fileId);
    
    if (!imageData) {
      console.error(`❌ Image not found: ${fileId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Image not found'
      });
    }
    
    // キャッシュヘッダーとCORSヘッダーを設定（1日間キャッシュ）
    res.set({
      'Content-Type': imageData.mimeType,
      'Content-Length': imageData.size,
      'Cache-Control': 'public, max-age=86400', // 1日間キャッシュ
      'Access-Control-Allow-Origin': '*', // CORS対応
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    
    // 画像データを返す
    res.send(imageData.buffer);
    
    console.log(`✅ Thumbnail image proxied successfully: ${fileId}`);
  } catch (error: any) {
    console.error('❌ Error proxying thumbnail image:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to proxy image from Google Drive',
      details: 'Failed to proxy image from Google Drive'
    });
  }
});

// フル画像用
app.get('/api/public/images/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    console.log(`🖼️ Proxying full image: ${fileId}`);
    
    // GoogleDriveServiceを使用して画像データを取得
    const driveService = new GoogleDriveService();
    
    const imageData = await driveService.getImageData(fileId);
    
    if (!imageData) {
      console.error(`❌ Image not found: ${fileId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Image not found'
      });
    }
    
    // キャッシュヘッダーとCORSヘッダーを設定（1日間キャッシュ）
    res.set({
      'Content-Type': imageData.mimeType,
      'Content-Length': imageData.size,
      'Cache-Control': 'public, max-age=86400', // 1日間キャッシュ
      'Access-Control-Allow-Origin': '*', // CORS対応
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    
    // 画像データを返す
    res.send(imageData.buffer);
    
    console.log(`✅ Full image proxied successfully: ${fileId}`);
  } catch (error: any) {
    console.error('❌ Error proxying full image:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to proxy image from Google Drive',
      details: 'Failed to proxy image from Google Drive'
    });
  }
});

// 概算書PDF生成（物件番号で生成）
app.post('/api/public/properties/:propertyNumber/estimate-pdf', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    
    console.log(`[Estimate PDF] Starting for property: ${propertyNumber}`);
    
    // PropertyServiceを使用（静的インポート）
    const propertyService = new PropertyService();
    
    // 概算書PDFを生成
    const pdfUrl = await propertyService.generateEstimatePdf(propertyNumber);
    
    console.log(`[Estimate PDF] Generated PDF URL: ${pdfUrl}`);

    res.json({ 
      success: true,
      pdfUrl 
    });
  } catch (error: any) {
    console.error('[Estimate PDF] Error:', error);
    console.error('[Estimate PDF] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message || '概算書の生成に失敗しました'
    });
  }
});

// パノラマURL取得（物件番号で取得）
app.get('/api/public/properties/:propertyNumber/panorama-url', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    
    console.log(`[Panorama URL] Fetching for property: ${propertyNumber}`);
    
    // PanoramaUrlServiceを使用（静的インポート）
    const panoramaUrlService = new PanoramaUrlService();
    
    // パノラマURLを取得
    const panoramaUrl = await panoramaUrlService.getPanoramaUrl(propertyNumber);
    
    if (panoramaUrl) {
      console.log(`[Panorama URL] Found: ${panoramaUrl}`);
      res.json({
        success: true,
        panoramaUrl,
      });
    } else {
      console.log(`[Panorama URL] Not found for property: ${propertyNumber}`);
      res.json({
        success: true,
        panoramaUrl: null,
      });
    }
  } catch (error: any) {
    console.error('[Panorama URL] Error:', error);
    console.error('[Panorama URL] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'パノラマURLの取得に失敗しました',
    });
  }
});

// 環境変数チェックエンドポイント（デバッグ用）
app.get('/api/check-env', (_req, res) => {
  const envCheck = {
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 設定済み' : '❌ 未設定',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅ 設定済み' : '❌ 未設定',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ 設定済み' : '❌ 未設定',
    NODE_ENV: process.env.NODE_ENV || '未設定',
  };

  res.status(200).json({
    message: 'Environment Variables Check',
    env: envCheck,
    timestamp: new Date().toISOString()
  });
});

// 問い合わせ送信API（直接スプレッドシートに書き込む）
app.post('/api/public/inquiries', async (req, res) => {
  try {
    console.log('[Inquiry API] Received inquiry request');
    
    // バリデーション
    const { name, email, phone, message, propertyId } = req.body;
    
    if (!name || !email || !phone || !message) {
      console.error('[Inquiry API] Validation failed: missing required fields');
      return res.status(400).json({
        success: false,
        message: '必須項目を入力してください'
      });
    }
    
    // 物件情報を取得（propertyIdが指定されている場合）
    let propertyNumber = null;
    if (propertyId) {
      console.log('[Inquiry API] Fetching property:', propertyId);
      const property = await propertyListingService.getPublicPropertyById(propertyId);
      if (property) {
        propertyNumber = property.property_number;
        console.log('[Inquiry API] Property found:', propertyNumber);
      }
    }
    
    // 直接スプレッドシートに書き込む
    try {
      console.log('[Inquiry API] Syncing to Google Sheets...');
      
      // Google Sheets認証
      const { GoogleSheetsClient } = await import('../src/services/GoogleSheetsClient');
      
      // Vercel環境：環境変数から一時ファイルを作成
      let keyPath = './google-service-account.json';
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !require('fs').existsSync(keyPath)) {
        const fs = require('fs');
        const tmpPath = '/tmp/google-service-account.json';
        fs.writeFileSync(tmpPath, process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        keyPath = tmpPath;
        console.log('[Inquiry API] Created temporary service account file');
      }
      
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
        sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
        serviceAccountKeyPath: keyPath,
      });
      
      await sheetsClient.authenticate();
      console.log('[Inquiry API] Google Sheets authenticated');
      
      // 最大買主番号を取得
      const { data: latestInquiry } = await supabase
        .from('property_inquiries')
        .select('buyer_number')
        .not('buyer_number', 'is', null)
        .order('buyer_number', { ascending: false })
        .limit(1)
        .single();
      
      const nextBuyerNumber = latestInquiry?.buyer_number ? latestInquiry.buyer_number + 1 : 1;
      
      // 電話番号を正規化
      const normalizedPhone = phone.replace(/[^0-9]/g, '');
      
      // 現在時刻をJST（日本時間）で取得
      const now = new Date();
      const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);
      
      // スプレッドシートに追加
      const rowData = {
        '買主番号': nextBuyerNumber.toString(),
        '作成日時': jstDateString,
        '●氏名・会社名': name,
        '●問合時ヒアリング': message,
        '●電話番号\n（ハイフン不要）': normalizedPhone,
        '●メアド': email,
        '●問合せ元': 'いふう独自サイト',
        '物件番号': propertyNumber || '',
        '【問合メール】電話対応': '未',
      };
      
      await sheetsClient.appendRow(rowData);
      console.log('[Inquiry API] Synced to Google Sheets with buyer number:', nextBuyerNumber);
      
      // データベースに保存（バックアップ用）
      await supabase
        .from('property_inquiries')
        .insert({
          property_id: propertyId || null,
          property_number: propertyNumber || null,
          name,
          email,
          phone,
          message,
          sheet_sync_status: 'synced',
          buyer_number: nextBuyerNumber,
          created_at: now.toISOString()
        });
      
      console.log('[Inquiry API] Saved to database as backup');
      
    } catch (syncError: any) {
      console.error('[Inquiry API] Sync error:', syncError);
      // スプレッドシート同期に失敗してもユーザーには成功を返す
      // データベースにfailed状態で保存
      await supabase
        .from('property_inquiries')
        .insert({
          property_id: propertyId || null,
          property_number: propertyNumber || null,
          name,
          email,
          phone,
          message,
          sheet_sync_status: 'failed',
          created_at: new Date().toISOString()
        });
    }
    
    // ユーザーに即座に成功を返す
    res.status(201).json({
      success: true,
      message: 'お問い合わせを受け付けました。担当者より折り返しご連絡いたします。'
    });
  } catch (error: any) {
    console.error('[Inquiry API] Error:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。'
    });
  }
});

// Cron Job: 問合せをスプレッドシートに同期（1分ごとに実行）
app.get('/api/cron/sync-inquiries', async (req, res) => {
  try {
    console.log('[Cron] Starting inquiry sync job...');
    
    // Vercel Cron Jobの認証チェック
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Cron] Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // pending状態の問合せを取得（最大10件）
    const { data: pendingInquiries, error: fetchError } = await supabase
      .from('property_inquiries')
      .select('*')
      .eq('sheet_sync_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (fetchError) {
      console.error('[Cron] Error fetching pending inquiries:', fetchError);
      throw fetchError;
    }
    
    if (!pendingInquiries || pendingInquiries.length === 0) {
      console.log('[Cron] No pending inquiries to sync');
      return res.status(200).json({ 
        success: true, 
        message: 'No pending inquiries',
        synced: 0
      });
    }
    
    console.log(`[Cron] Found ${pendingInquiries.length} pending inquiries`);
    
    // Google Sheets認証
    const { GoogleSheetsClient } = await import('../src/services/GoogleSheetsClient');
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: './google-service-account.json',
    });
    
    await sheetsClient.authenticate();
    console.log('[Cron] Google Sheets authenticated');
    
    // 最大買主番号を取得
    const { data: latestInquiry } = await supabase
      .from('property_inquiries')
      .select('buyer_number')
      .not('buyer_number', 'is', null)
      .order('buyer_number', { ascending: false })
      .limit(1)
      .single();
    
    let nextBuyerNumber = latestInquiry?.buyer_number ? latestInquiry.buyer_number + 1 : 1;
    
    // 各問合せを同期
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const inquiry of pendingInquiries) {
      try {
        console.log(`[Cron] Syncing inquiry ${inquiry.id} (${inquiry.name})...`);
        
        // 電話番号を正規化
        const normalizedPhone = inquiry.phone.replace(/[^0-9]/g, '');
        
        // 現在時刻をJST（日本時間）で取得
        const nowUtc = new Date(inquiry.created_at);
        const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
        const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);
        
        // スプレッドシートに追加
        const rowData = {
          '買主番号': nextBuyerNumber.toString(),
          '作成日時': jstDateString,
          '●氏名・会社名': inquiry.name,
          '●問合時ヒアリング': inquiry.message,
          '●電話番号\n（ハイフン不要）': normalizedPhone,
          '●メアド': inquiry.email,
          '●問合せ元': 'いふう独自サイト',
          '物件番号': inquiry.property_number || '',
          '【問合メール】電話対応': '未',
        };
        
        await sheetsClient.appendRow(rowData);
        
        // データベースを更新
        await supabase
          .from('property_inquiries')
          .update({ 
            sheet_sync_status: 'synced',
            buyer_number: nextBuyerNumber
          })
          .eq('id', inquiry.id);
        
        console.log(`[Cron] Synced inquiry ${inquiry.id} with buyer number ${nextBuyerNumber}`);
        syncedCount++;
        nextBuyerNumber++;
        
      } catch (error) {
        console.error(`[Cron] Failed to sync inquiry ${inquiry.id}:`, error);
        
        // 失敗をデータベースに記録
        await supabase
          .from('property_inquiries')
          .update({ 
            sheet_sync_status: 'failed',
            sync_retry_count: (inquiry.sync_retry_count || 0) + 1
          })
          .eq('id', inquiry.id);
        
        failedCount++;
      }
    }
    
    console.log(`[Cron] Sync job completed: ${syncedCount} synced, ${failedCount} failed`);
    
    res.status(200).json({
      success: true,
      synced: syncedCount,
      failed: failedCount,
      total: pendingInquiries.length
    });
    
  } catch (error: any) {
    console.error('[Cron] Error in sync job:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      retryable: false,
    },
  });
});

// Vercel用のハンドラー（重要：これがないとVercelで動作しない）
// Vercelのサーバーレス関数として動作させるため、Expressアプリをラップ
export default async (req: VercelRequest, res: VercelResponse) => {
  // Expressアプリにリクエストを渡す
  return app(req as any, res as any);
};
