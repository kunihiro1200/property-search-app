// 公開物件サイト専用のエントリーポインチE
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

// 環墁E��数のチE��チE��ログ
console.log('🔍 Environment variables check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? `Set (${process.env.SUPABASE_SERVICE_KEY.length} chars)` : 'Missing',
  GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? `Set (${process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length} chars)` : 'Missing',
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'Not set',
  NODE_ENV: process.env.NODE_ENV || 'Not set',
});

// Supabase クライアント�E初期匁E
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PropertyListingServiceの初期化（ローカル環墁E��同じ�E�E
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

// チE��ト用�E�publicPropertiesRoutesが読み込めてぁE��か確誁E
app.get('/api/test/routes', (_req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'publicPropertiesRoutes is now active',
    timestamp: new Date().toISOString() 
  });
});

// ⚠�E�E重要E publicPropertiesRoutes を�Eに登録�E�より�E体的なルートを優先！E
// app.use('/api/public', publicPropertiesRoutes); // 一時的にコメントアウト（ルート�E重褁E��回避�E�E

// 公開物件一覧取得（�Eての物件を取得、atbb_statusはバッジ表示用�E�E
app.get('/api/public/properties', async (req, res) => {
  try {
    console.log('🔍 Fetching properties from database...');
    
    // クエリパラメータを取征E
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
    const withCoordinates = req.query.withCoordinates === 'true'; // 座標がある物件のみ取征E
    const skipImages = req.query.skipImages === 'true'; // 画像取得をスキチE�E�E�地図ビュー用�E�E
    
    console.log('📊 Query params:', { limit, offset, propertyNumber, location, types, minPrice, maxPrice, minAge, maxAge, showPublicOnly, withCoordinates, skipImages });
    
    // 価格篁E��のバリチE�Eション
    let priceFilter: { min?: number; max?: number } | undefined;
    if (minPrice !== undefined || maxPrice !== undefined) {
      priceFilter = {};
      if (minPrice !== undefined) {
        priceFilter.min = minPrice * 10000; // 丁E�Eを�Eに変換
      }
      if (maxPrice !== undefined) {
        priceFilter.max = maxPrice * 10000; // 丁E�Eを�Eに変換
      }
    }
    
    // 物件タイプフィルター
    let propertyTypeFilter: string[] | undefined;
    if (types) {
      propertyTypeFilter = types.split(',');
    }
    
    // 築年数篁E��のバリチE�Eション
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
    
    // PropertyListingServiceを使用�E�ローカル環墁E��同じ�E�E
    const result = await propertyListingService.getPublicProperties({
      limit,
      offset,
      propertyType: propertyTypeFilter,
      priceRange: priceFilter,
      location,
      propertyNumber,
      buildingAgeRange,
      showPublicOnly,
      withCoordinates, // 座標がある物件のみ取征E
      skipImages, // 画像取得をスキチE�E�E�地図ビュー用�E�E
    });

    console.log(`✁EFound ${result.properties?.length || 0} properties (total: ${result.pagination.total})`);

    res.json({ 
      success: true, 
      properties: result.properties || [],
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('❁EError fetching properties:', error);
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

// 公開物件詳細取得！Etbb_statusでフィルタリングしなぁE��E
app.get('/api/public/properties/:propertyIdentifier', async (req, res) => {
  try {
    const { propertyIdentifier } = req.params;
    console.log(`🔍 Fetching property details for: ${propertyIdentifier}`);
    
    // UUIDか物件番号かを判定！EUIDは36斁E���Eハイフン付き形式！E
    const isUuid = propertyIdentifier.length === 36 && propertyIdentifier.includes('-');
    
    // チE�Eタベ�Eスから物件詳細を取得！Etbb_statusでフィルタリングしなぁE��E
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
      console.error('❁EDatabase error:', error);
      throw error;
    }

    if (!property) {
      return res.status(404).json({ 
        success: false, 
        error: 'Property not found'
      });
    }

    console.log(`✁EFound property: ${propertyIdentifier} (${property.property_number})`);

    // image_urlをimagesに変換�E�ESON配�Eまた�E単一斁E���Eに対応！E
    let images = [];
    if (property.image_url) {
      try {
        // JSON配�Eとしてパ�Eスを試みめE
        images = JSON.parse(property.image_url);
      } catch (e) {
        // パ�Eスに失敗した場合�E単一の斁E���Eとして扱ぁE
        // 空斁E���EでなぁE��合�Eみ配�Eに追加
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
    console.error('❁EError fetching property details:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Failed to fetch property details from database'
    });
  }
});

// 公開物件の完�Eな詳細惁E��取得（物件番号また�EUUIDで取得！E
app.get('/api/public/properties/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[Complete API] Fetching complete data for: ${id}`);
    
    // 物件惁E��を取征E
    const property = await propertyListingService.getPublicPropertyById(id);
    
    if (!property) {
      console.error(`[Complete API] Property not found: ${id}`);
      return res.status(404).json({ message: 'Property not found' });
    }
    
    console.log(`[Complete API] Found property: ${property.property_number}`);
    
    // PropertyDetailsServiceを使用�E�静皁E��ンポ�Eト！E
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

    // 決済日を取得（�E紁E��みの場合�Eみ�E�E
    let settlementDate = null;
    const isSold = property.atbb_status === '成紁E��み' || property.atbb_status === 'sold';
    if (isSold) {
      try {
        const propertyService = new PropertyService();
        settlementDate = await propertyService.getSettlementDate(property.property_number);
      } catch (err) {
        console.error('[Complete API] Settlement date error:', err);
      }
    }

    // パノラマURLを取征E
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

// 物件番号ベ�Eスの画像一覧取得エンド�Eイント！EublicPropertiesRoutesの代替�E�E
app.get('/api/public/properties/:identifier/images', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { includeHidden = 'false' } = req.query;
    
    console.log(`🖼�E�EFetching images for: ${identifier}`);

    // UUIDの形式かどぁE��をチェチE��
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(identifier);

    // 物件惁E��を取征E
    let property;
    if (isUUID) {
      property = await propertyListingService.getPublicPropertyById(identifier);
    } else {
      property = await propertyListingService.getPublicPropertyByNumber(identifier);
    }

    if (!property) {
      console.error(`❁EProperty not found: ${identifier}`);
      return res.status(404).json({ error: 'Property not found' });
    }

    console.log(`✁EFound property: ${property.property_number} (${property.id})`);

    // storage_locationを優先的に使用
    let storageUrl = property.storage_location;
    
    // storage_locationが空の場合、property.athome_dataから取征E
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      // athome_dataの最初�E要素がフォルダURL
      storageUrl = property.athome_data[0];
      console.log(`[Images API] Using athome_data as storage_url: ${storageUrl}`);
    }

    if (!storageUrl) {
      console.error(`❁ENo storage URL found for property: ${identifier}`);
      return res.status(404).json({ 
        error: 'Storage URL not found',
        message: '画像�E格納�EURLが設定されてぁE��せん'
      });
    }

    // PropertyImageServiceを使用して画像を取征E
    const propertyImageService = new PropertyImageService(
      60, // cacheTTLMinutes
      parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10),
      parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10),
      parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10)
    );

    const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);

    // 非表示画像リストを取征E
    const hiddenImages = await propertyListingService.getHiddenImages(property.id);

    // includeHiddenがfalseの場合、E��表示画像をフィルタリング
    let filteredImages = result.images;
    if (includeHidden !== 'true' && hiddenImages.length > 0) {
      filteredImages = result.images.filter(img => !hiddenImages.includes(img.id));
    }

    console.log(`✁EFound ${filteredImages.length} images (${hiddenImages.length} hidden)`);

    // キャチE��ュヘッダーを設定！E時間�E�E
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
    console.error('❁EError fetching property images:', error);
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

// 画像�Eロキシエンド�Eイント！Eoogle Driveの画像をバックエンド経由で取得！E
// サムネイル用
app.get('/api/public/images/:fileId/thumbnail', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    console.log(`🖼�E�EProxying thumbnail image: ${fileId}`);
    
    // GoogleDriveServiceを使用して画像データを取征E
    const driveService = new GoogleDriveService();
    
    const imageData = await driveService.getImageData(fileId);
    
    if (!imageData) {
      console.error(`❁EImage not found: ${fileId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Image not found'
      });
    }
    
    // キャチE��ュヘッダーとCORSヘッダーを設定！E日間キャチE��ュ�E�E
    res.set({
      'Content-Type': imageData.mimeType,
      'Content-Length': imageData.size,
      'Cache-Control': 'public, max-age=86400', // 1日間キャチE��ュ
      'Access-Control-Allow-Origin': '*', // CORS対忁E
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    
    // 画像データを返す
    res.send(imageData.buffer);
    
    console.log(`✁EThumbnail image proxied successfully: ${fileId}`);
  } catch (error: any) {
    console.error('❁EError proxying thumbnail image:', error);
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
    
    console.log(`🖼�E�EProxying full image: ${fileId}`);
    
    // GoogleDriveServiceを使用して画像データを取征E
    const driveService = new GoogleDriveService();
    
    const imageData = await driveService.getImageData(fileId);
    
    if (!imageData) {
      console.error(`❁EImage not found: ${fileId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Image not found'
      });
    }
    
    // キャチE��ュヘッダーとCORSヘッダーを設定！E日間キャチE��ュ�E�E
    res.set({
      'Content-Type': imageData.mimeType,
      'Content-Length': imageData.size,
      'Cache-Control': 'public, max-age=86400', // 1日間キャチE��ュ
      'Access-Control-Allow-Origin': '*', // CORS対忁E
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    
    // 画像データを返す
    res.send(imageData.buffer);
    
    console.log(`✁EFull image proxied successfully: ${fileId}`);
  } catch (error: any) {
    console.error('❁EError proxying full image:', error);
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

// 概算書PDF生�E�E�物件番号で生�E�E�E
app.post('/api/public/properties/:propertyNumber/estimate-pdf', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    
    console.log(`[Estimate PDF] Starting for property: ${propertyNumber}`);
    
    // PropertyServiceを使用�E�静皁E��ンポ�Eト！E
    const propertyService = new PropertyService();
    
    // 概算書PDFを生戁E
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
      message: error.message || '概算書の生�Eに失敗しました'
    });
  }
});

// パノラマURL取得（物件番号で取得！E
app.get('/api/public/properties/:propertyNumber/panorama-url', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    
    console.log(`[Panorama URL] Fetching for property: ${propertyNumber}`);
    
    // PanoramaUrlServiceを使用�E�静皁E��ンポ�Eト！E
    const panoramaUrlService = new PanoramaUrlService();
    
    // パノラマURLを取征E
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

// 環墁E��数チェチE��エンド�Eイント（デバッグ用�E�E
app.get('/api/check-env', (_req, res) => {
  const envCheck = {
    SUPABASE_URL: process.env.SUPABASE_URL ? '✁E設定済み' : '❁E未設宁E,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✁E設定済み' : '❁E未設宁E,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✁E設定済み' : '❁E未設宁E,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✁E設定済み' : '❁E未設宁E,
    NODE_ENV: process.env.NODE_ENV || '未設宁E,
  };

  res.status(200).json({
    message: 'Environment Variables Check',
    env: envCheck,
    timestamp: new Date().toISOString()
  });
});

// 問い合わせ送信API�E�直接スプレチE��シートに書き込む�E�E
app.post('/api/public/inquiries', async (req, res) => {
  try {
    console.error('[Inquiry API] Received inquiry request');
    
    // バリチE�Eション
    const { name, email, phone, message, propertyId } = req.body;
    
    if (!name || !email || !phone || !message) {
      console.error('[Inquiry API] Validation failed: missing required fields');
      return res.status(400).json({
        success: false,
        message: '忁E��頁E��を�E力してください'
      });
    }
    
    // 物件惁E��を取得！EropertyIdが指定されてぁE��場合！E
    let propertyNumber = null;
    if (propertyId) {
      console.error('[Inquiry API] Fetching property:', propertyId);
      const property = await propertyListingService.getPublicPropertyById(propertyId);
      if (property) {
        propertyNumber = property.property_number;
        console.error('[Inquiry API] Property found:', propertyNumber);
      }
    }
    
    // 買主番号を採番�E�スプレチE��シート�Eース�E�一番下�E衁E1�E�E
    let nextBuyerNumber = 1;
    
    try {
      console.error('[Inquiry API] Getting buyer number from spreadsheet...');
      console.error('[Inquiry API] Environment check:', {
        hasGoogleServiceAccountJson: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        googleServiceAccountJsonLength: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0,
        spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID,
        sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスチE,
      });
      
      const { GoogleSheetsClient } = await import('../src/services/GoogleSheetsClient');
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
        sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスチE,
      });
      
      console.error('[Inquiry API] Calling authenticate()...');
      await sheetsClient.authenticate();
      console.error('[Inquiry API] Authentication completed successfully');
      
      // 最後�E行だけを取得（高速！E
      console.error('[Inquiry API] Calling getLastRow()...');
      const lastRow = await sheetsClient.getLastRow();
      
      console.error('[Inquiry API] Last row from spreadsheet:', lastRow);
      
      if (lastRow) {
        const lastBuyerNumber = lastRow['買主番号'];
        console.error('[Inquiry API] Last buyer number value:', lastBuyerNumber);
        console.error('[Inquiry API] Last row keys:', Object.keys(lastRow));
        
        if (lastBuyerNumber) {
          nextBuyerNumber = parseInt(String(lastBuyerNumber)) + 1;
          console.error('[Inquiry API] Last buyer number from spreadsheet:', lastBuyerNumber);
        } else {
          console.error('[Inquiry API] 買主番号 key not found in last row');
        }
      } else {
        console.error('[Inquiry API] Last row is null');
      }
      
      console.error('[Inquiry API] Next buyer number:', nextBuyerNumber);
    } catch (error: any) {
      console.error('[Inquiry API] Failed to get buyer number from spreadsheet:', error.message);
      console.error('[Inquiry API] Error stack:', error.stack);
      // フォールバック: チE�Eタベ�Eスから取征E
      const { data: latestInquiry } = await supabase
        .from('property_inquiries')
        .select('buyer_number')
        .not('buyer_number', 'is', null)
        .order('buyer_number', { ascending: false })
        .limit(1)
        .single();
      
      if (latestInquiry?.buyer_number) {
        nextBuyerNumber = latestInquiry.buyer_number + 1;
        console.error('[Inquiry API] Next buyer number from database:', nextBuyerNumber);
      } else {
        nextBuyerNumber = 1;
        console.error('[Inquiry API] No buyer numbers found, starting from 1');
      }
    }
    
    let sheetSyncStatus = 'synced';
    
    // スプレチE��シートに同期�E�同期的に実行！E
    try {
      console.error('[Inquiry API] Starting spreadsheet sync...');
      const { GoogleSheetsClient } = await import('../src/services/GoogleSheetsClient');
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
        sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスチE,
      });
      
      await sheetsClient.authenticate();
      console.error('[Inquiry API] Google Sheets authenticated');
      
      // 電話番号を正規化
      const normalizedPhone = phone.replace(/[^0-9]/g, '');
      
      // 現在時刻をJST�E�日本時間�E�で取征E
      const nowUtc = new Date();
      const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
      const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);
      
      // 受付日�E�今日の日付、YYYY/MM/DD形式！E
      const receptionDate = jstDate.toISOString().substring(0, 10).replace(/-/g, '/');
      
      // スプレチE��シートに追加
      const rowData = {
        '買主番号': nextBuyerNumber.toString(),
        '作�E日晁E: jstDateString,
        '●氏名・会社吁E: name,
        '●問合時ヒアリング': message,
        '●電話番号\n�E�ハイフン不要E��E: normalizedPhone,
        '受付日': receptionDate,
        '●メアチE: email,
        '●問合せ允E: 'ぁE�EぁE��自サイチE,
        '物件番号': propertyNumber || '',
        '【問合メール】電話対忁E: '未',
      };
      
      await sheetsClient.appendRow(rowData);
      console.error('[Inquiry API] Spreadsheet sync completed successfully');
      
    } catch (syncError: any) {
      console.error('[Inquiry API] Spreadsheet sync error:', syncError);
      sheetSyncStatus = 'failed';
      // エラーが発生してもデータベ�Eスには保存すめE
    }
    
    // チE�Eタベ�Eスに保孁E
    const { data: savedInquiry, error: saveError } = await supabase
      .from('property_inquiries')
      .insert({
        property_id: propertyId || null,
        property_number: propertyNumber || null,
        name,
        email,
        phone,
        message,
        buyer_number: nextBuyerNumber,
        sheet_sync_status: sheetSyncStatus,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('[Inquiry API] Database save error:', saveError);
      throw saveError;
    }
    
    console.error('[Inquiry API] Saved to database with status:', sheetSyncStatus);
    
    // ユーザーに成功を返す
    res.status(201).json({
      success: true,
      message: 'お問ぁE��わせを受け付けました。担当老E��り折り返しご連絡ぁE��します、E
    });
  } catch (error: any) {
    console.error('[Inquiry API] Error:', error);
    res.status(500).json({
      success: false,
      message: 'サーバ�Eエラーが発生しました。しばらく時間をおぁE��から再度お試しください、E
    });
  }
});

// Cron Job: 問合せをスプレチE��シートに同期�E�E刁E��とに実行！E
app.get('/api/cron/sync-inquiries', async (req, res) => {
  try {
    console.log('[Cron] Starting inquiry sync job...');
    
    // ⚠�E�EVercel Cron Jobsは冁E��皁E��実行されるため、認証チェチE��は不要E
    // 外部からのアクセスを防ぐため、Vercel Dashboardで設定すめE
    
    // pending状態�E問合せを取得（最大10件�E�E
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
    
    // Google Sheets認証�E�環墁E��数から自動的に読み込まれる�E�E
    const { GoogleSheetsClient } = await import('../src/services/GoogleSheetsClient');
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスチE,
    });
    
    await sheetsClient.authenticate();
    console.log('[Cron] Google Sheets authenticated');
    
    // 最大買主番号を取征E
    const { data: latestInquiry } = await supabase
      .from('property_inquiries')
      .select('buyer_number')
      .not('buyer_number', 'is', null)
      .order('buyer_number', { ascending: false })
      .limit(1)
      .single();
    
    let nextBuyerNumber = latestInquiry?.buyer_number ? latestInquiry.buyer_number + 1 : 1;
    
    // 吁E��合せを同朁E
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const inquiry of pendingInquiries) {
      try {
        console.log(`[Cron] Syncing inquiry ${inquiry.id} (${inquiry.name})...`);
        
        // 電話番号を正規化
        const normalizedPhone = inquiry.phone.replace(/[^0-9]/g, '');
        
        // 現在時刻をJST�E�日本時間�E�で取征E
        const nowUtc = new Date(inquiry.created_at);
        const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
        const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);
        
        // 受付日�E�今日の日付、YYYY/MM/DD形式！E
        const receptionDate = jstDate.toISOString().substring(0, 10).replace(/-/g, '/');
        
        // スプレチE��シートに追加
        const rowData = {
          '買主番号': nextBuyerNumber.toString(),
          '作�E日晁E: jstDateString,
          '●氏名・会社吁E: inquiry.name,
          '●問合時ヒアリング': inquiry.message,
          '●電話番号\n�E�ハイフン不要E��E: normalizedPhone,
          '受付日': receptionDate,
          '●メアチE: inquiry.email,
          '●問合せ允E: 'ぁE�EぁE��自サイチE,
          '物件番号': inquiry.property_number || '',
          '【問合メール】電話対忁E: '未',
        };
        
        await sheetsClient.appendRow(rowData);
        
        // チE�Eタベ�Eスを更新
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
        
        // 失敗をチE�Eタベ�Eスに記録
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

// Vercel用のハンドラー�E�重要E��これがなぁE��Vercelで動作しなぁE��E
// Vercelのサーバ�Eレス関数として動作させるため、ExpressアプリをラチE�E
export default async (req: VercelRequest, res: VercelResponse) => {
  // Expressアプリにリクエストを渡ぁE
  return app(req as any, res as any);
};
