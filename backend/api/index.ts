// 公開物件サイト専用のエントリーポイント
// Force cache clear: 2026-01-31 17:00 - Restore working state
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
import { GoogleSheetsClient } from '../src/services/GoogleSheetsClient';
import { AthomeSheetSyncService } from '../src/services/AthomeSheetSyncService';
import publicPropertiesRoutes from '../src/routes/publicProperties';

const app = express();

// 環境変数のデバッグログ
console.log('🔍 Environment variables check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? `Set (${process.env.SUPABASE_SERVICE_KEY.length} chars)` : 'Missing',
  GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? `Set (${process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length} chars)` : 'Missing',
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'Not set',
  GOOGLE_SHEETS_BUYER_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID || 'Not set',
  GOOGLE_SHEETS_BUYER_SHEET_NAME: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || 'Not set',
  NODE_ENV: process.env.NODE_ENV || 'Not set',
});

// Supabase クライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PropertyListingServiceの初期化（ローカル環境と同じ）
const propertyListingService = new PropertyListingService();

/**
 * 日本語の物件種別を英語に変換
 * 
 * @param japaneseType - 日本語の物件種別（例: "土地", "戸建", "マンション"）
 * @returns 英語の物件種別（例: "land", "detached_house", "apartment"）
 */
function convertPropertyTypeToEnglish(japaneseType: string | null | undefined): 'land' | 'detached_house' | 'apartment' | null {
  if (!japaneseType) return null;
  
  const typeMapping: Record<string, 'land' | 'detached_house' | 'apartment'> = {
    '戸建': 'detached_house',
    '戸建て': 'detached_house',
    'マンション': 'apartment',
    '土地': 'land',
    // 英語の値もそのまま返す
    'land': 'land',
    'detached_house': 'detached_house',
    'apartment': 'apartment',
  };
  
  return typeMapping[japaneseType] || null;
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // 公開サイトなので全てのオリジンを許可
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2026-01-29-16:30-price-fix-api-endpoint'
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2026-01-29-16:30-price-fix-api-endpoint'
  });
});

// URL短縮リダイレクト解決エンドポイント
app.get('/api/url-redirect/resolve', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log('🔗 Resolving shortened URL:', url);
    
    // HTTPSリクエストでリダイレクト先を取得
    const https = await import('https');
    const urlModule = await import('url');
    
    const parsedUrl = urlModule.parse(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    };
    
    const redirectedUrl = await new Promise<string>((resolve, reject) => {
      const request = https.request(options, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const location = response.headers.location;
          if (location) {
            console.log('✅ Redirected to:', location);
            resolve(location);
          } else {
            reject(new Error('No location header found'));
          }
        } else {
          resolve(url); // リダイレクトがない場合は元のURLを返す
        }
      });
      
      request.on('error', (error) => {
        console.error('❌ Error resolving URL:', error);
        reject(error);
      });
      
      request.end();
    });
    
    res.json({ redirectedUrl });
  } catch (error: any) {
    console.error('❌ Failed to resolve URL:', error);
    res.status(500).json({ error: 'Failed to resolve URL', message: error.message });
  }
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
    
    console.log('🔍🔍🔍 [API Endpoint] skipImages param:', req.query.skipImages, 'parsed:', skipImages);
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
    
    // 🔧 FIX: PropertyListingServiceが price フィールドを返さない場合、
    // Supabaseから直接 sales_price と listing_price を取得して price を計算
    const propertiesWithPrice = await Promise.all(
      (result.properties || []).map(async (property) => {
        // すでに price が設定されている場合はスキップ
        if (property.price !== null && property.price !== undefined) {
          return property;
        }
        
        // Supabaseから sales_price と listing_price を取得
        const { data: dbProperty, error } = await supabase
          .from('property_listings')
          .select('sales_price, listing_price')
          .eq('id', property.id)
          .single();
        
        if (error) {
          console.error(`[API Endpoint] Failed to fetch price for ${property.property_number}:`, error);
          return property;
        }
        
        // price を計算
        const calculatedPrice = dbProperty.sales_price || dbProperty.listing_price || 0;
        
        console.log(`[API Endpoint] Fixed price for ${property.property_number}:`, {
          sales_price: dbProperty.sales_price,
          listing_price: dbProperty.listing_price,
          calculated_price: calculatedPrice,
        });
        
        return {
          ...property,
          price: calculatedPrice,
          sales_price: dbProperty.sales_price,
          listing_price: dbProperty.listing_price,
        };
      })
    );

    res.json({ 
      success: true, 
      properties: propertiesWithPrice,
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
    
    // 全てのデータ取得を並列実行（高速化）
    const startTime = Date.now();
    
    const [dbDetails, settlementDate] = await Promise.all([
      // PropertyDetailsServiceを使用（静的インポート）
      (async () => {
        try {
          const propertyDetailsService = new PropertyDetailsService();
          const details = await propertyDetailsService.getPropertyDetails(property.property_number);
          console.log(`[Complete API] PropertyDetailsService returned:`, {
            has_favorite_comment: !!details.favorite_comment,
            has_recommended_comments: !!details.recommended_comments,
            has_athome_data: !!details.athome_data,
            has_property_about: !!details.property_about
          });
          
          // コメントデータがnullまたは空の場合、Athomeシートから自動同期
          // recommended_commentsが空配列の場合も再同期する（過去の間違ったデータを修正）
          const needsSync = !details.favorite_comment || 
                           !details.recommended_comments || 
                           (Array.isArray(details.recommended_comments) && details.recommended_comments.length === 0);
          
          if (needsSync) {
            console.log(`[Complete API] Comment data is missing or empty, syncing from Athome sheet...`);
            console.log(`[Complete API] Current state:`, {
              has_favorite_comment: !!details.favorite_comment,
              has_recommended_comments: !!details.recommended_comments,
              recommended_comments_length: Array.isArray(details.recommended_comments) ? details.recommended_comments.length : 'N/A'
            });
            try {
              const athomeSheetSyncService = new AthomeSheetSyncService();
              // 日本語の物件種別を英語に変換
              const englishPropertyType = convertPropertyTypeToEnglish(property.property_type);
              console.log(`[Complete API] Property type conversion: "${property.property_type}" -> "${englishPropertyType}"`);
              
              if (!englishPropertyType) {
                console.error(`[Complete API] Invalid property type: "${property.property_type}"`);
              } else {
                const syncSuccess = await athomeSheetSyncService.syncPropertyComments(
                  property.property_number,
                  englishPropertyType
                );
              
              if (syncSuccess) {
                console.log(`[Complete API] Successfully synced comments from Athome sheet`);
                // 同期後のデータを再取得
                const updatedDetails = await propertyDetailsService.getPropertyDetails(property.property_number);
                console.log(`[Complete API] Updated details:`, {
                  has_favorite_comment: !!updatedDetails.favorite_comment,
                  has_recommended_comments: !!updatedDetails.recommended_comments,
                  has_athome_data: !!updatedDetails.athome_data,
                  has_property_about: !!updatedDetails.property_about
                });
                
                // property_aboutがまだnullの場合、物件スプレッドシートから取得
                if (!updatedDetails.property_about) {
                  console.log(`[Complete API] property_about is still null, fetching from property spreadsheet...`);
                  try {
                    const propertyService = new PropertyService();
                    const propertyAbout = await propertyService.getPropertyAbout(property.property_number);
                    
                    if (propertyAbout) {
                      await propertyDetailsService.upsertPropertyDetails(property.property_number, {
                        property_about: propertyAbout
                      });
                      console.log(`[Complete API] Successfully synced property_about from property spreadsheet`);
                      updatedDetails.property_about = propertyAbout;
                    } else {
                      console.log(`[Complete API] property_about not found in property spreadsheet`);
                    }
                  } catch (propertyAboutError: any) {
                    console.error(`[Complete API] Error syncing property_about:`, propertyAboutError.message);
                  }
                }
                
                return updatedDetails;
              } else {
                console.error(`[Complete API] Failed to sync comments from Athome sheet`);
              }
              }
            } catch (syncError: any) {
              console.error(`[Complete API] Error syncing comments:`, syncError.message);
            }
          }
          
          return details;
        } catch (error: any) {
          console.error(`[Complete API] Error calling PropertyDetailsService:`, error);
          return {
            property_number: property.property_number,
            favorite_comment: null,
            recommended_comments: null,
            athome_data: null,
            property_about: null
          };
        }
      })(),
      
      // 決済日を取得（成約済みの場合のみ）
      (async () => {
        const isSold = property.atbb_status === '成約済み' || property.atbb_status === 'sold';
        if (!isSold) return null;
        
        try {
          const propertyService = new PropertyService();
          return await propertyService.getSettlementDate(property.property_number);
        } catch (err) {
          console.error('[Complete API] Settlement date error:', err);
          return null;
        }
      })(),
    ]);
    
    // パノラマURLを取得（athome_dataから取得、なければnull）
    let panoramaUrl = null;
    if (dbDetails.athome_data && Array.isArray(dbDetails.athome_data) && dbDetails.athome_data.length > 0) {
      // athome_dataの構造:
      // - [0]: Google DriveフォルダURL または パノラマURL
      // - [1]: パノラマURL（存在する場合）
      
      // まず[1]を確認（2要素構造の場合）
      if (dbDetails.athome_data.length > 1 && dbDetails.athome_data[1]) {
        panoramaUrl = dbDetails.athome_data[1];
        console.log(`[Complete API] Panorama URL from athome_data[1]: ${panoramaUrl}`);
      } 
      // [1]がない場合、[0]がパノラマURLかチェック（vrpanorama.athome.jpを含むか）
      else if (dbDetails.athome_data[0] && typeof dbDetails.athome_data[0] === 'string' && dbDetails.athome_data[0].includes('vrpanorama.athome.jp')) {
        panoramaUrl = dbDetails.athome_data[0];
        console.log(`[Complete API] Panorama URL from athome_data[0]: ${panoramaUrl}`);
      }
      
      if (!panoramaUrl) {
        console.log(`[Complete API] Panorama URL not found in athome_data:`, dbDetails.athome_data);
      }
    } else {
      console.log(`[Complete API] Panorama URL not available:`, {
        has_athome_data: !!dbDetails.athome_data,
        is_array: Array.isArray(dbDetails.athome_data),
        length: dbDetails.athome_data?.length || 0,
        athome_data: dbDetails.athome_data,
      });
    }
    
    const endTime = Date.now();
    console.log(`[Complete API] All data fetched in ${endTime - startTime}ms`);

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

// 画像キャッシュクリアエンドポイント（特定の物件または全体）
app.post('/api/public/properties/:identifier/clear-image-cache', async (req, res) => {
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
      return res.status(404).json({ 
        success: false,
        error: 'Property not found' 
      });
    }

    console.log(`✅ Found property: ${property.property_number} (${property.id})`);

    // storage_locationを取得
    let storageUrl = property.storage_location;
    
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      storageUrl = property.athome_data[0];
    }

    if (!storageUrl) {
      console.error(`❌ No storage URL found for property: ${identifier}`);
      return res.status(404).json({ 
        success: false,
        error: 'Storage URL not found',
        message: '画像の格納先URLが設定されていません'
      });
    }

    // PropertyImageServiceを使用してキャッシュをクリア
    const propertyImageService = new PropertyImageService(
      60, // cacheTTLMinutes
      parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10),
      parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10),
      parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10)
    );

    // フォルダIDを抽出
    const folderId = propertyImageService.extractFolderIdFromUrl(storageUrl);
    
    if (folderId) {
      // 特定のフォルダのキャッシュをクリア
      propertyImageService.clearCache(folderId);
      console.log(`✅ Image cache cleared for folder: ${folderId}`);
      
      res.json({
        success: true,
        message: `物件 ${property.property_number} の画像キャッシュをクリアしました`,
        propertyNumber: property.property_number,
        folderId: folderId
      });
    } else {
      console.error(`❌ Could not extract folder ID from storage URL: ${storageUrl}`);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid storage URL',
        message: '格納先URLからフォルダIDを抽出できませんでした'
      });
    }
  } catch (error: any) {
    console.error('❌ Error clearing image cache:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to clear image cache'
    });
  }
});

// 全物件の画像キャッシュをクリア
app.post('/api/public/clear-all-image-cache', async (req, res) => {
  try {
    console.log(`🗑️ Clearing all image cache`);

    // PropertyImageServiceを使用して全キャッシュをクリア
    const propertyImageService = new PropertyImageService(
      60, // cacheTTLMinutes
      parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10),
      parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10),
      parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10)
    );

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

// 格納先URLを更新
app.post('/api/public/properties/:identifier/update-storage-url', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { storageUrl } = req.body;
    
    console.log(`[Update Storage URL] Request for property: ${identifier}`);
    console.log(`[Update Storage URL] New storage URL: ${storageUrl}`);
    
    if (!storageUrl || typeof storageUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid storage URL',
        message: '有効なGoogle DriveフォルダURLを入力してください'
      });
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
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
    }
    
    // storage_locationを更新
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({ 
        storage_location: storageUrl
      })
      .eq('id', property.id);
    
    if (updateError) {
      console.error('[Update Storage URL] Database error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'データベースの更新に失敗しました'
      });
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

// 画像・基本情報を更新（軽量版）
app.post('/api/public/properties/:identifier/refresh-essential', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    console.log(`[Refresh Essential] Request for property: ${identifier}`);
    
    // UUIDの形式かどうかをチェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(identifier);
    
    // 物件情報を取得（データベース）- 最新のデータを取得
    let property;
    if (isUUID) {
      property = await propertyListingService.getPublicPropertyById(identifier);
    } else {
      property = await propertyListingService.getPublicPropertyByNumber(identifier);
    }
    
    if (!property) {
      console.log(`[Refresh Essential] Property not found: ${identifier}`);
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
    }
    
    console.log(`[Refresh Essential] Property found: ${property.property_number}`);
    console.log(`[Refresh Essential] Current storage_location: ${property.storage_location}`);
    
    // 画像を取得（Google Drive）- キャッシュをバイパス
    const propertyImageService = new PropertyImageService(
      60, // cacheTTLMinutes
      parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10),
      parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10),
      parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10)
    );
    
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
        console.log(`[Refresh Essential] Clearing cache for folder: ${folderId}`);
        propertyImageService.clearCache(folderId);
      }
      
      const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);
      
      // 非表示画像をフィルタリング
      const hiddenImages = await propertyListingService.getHiddenImages(property.id);
      images = result.images.filter(img => !hiddenImages.includes(img.id));
      
      console.log(`[Refresh Essential] Images fetched: ${images.length} images (${result.images.length} total, ${hiddenImages.length} hidden)`);
      
      // 最初の画像のURLを取得（データベース更新用）
      if (images.length > 0) {
        newImageUrl = images[0].fullImageUrl;
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
app.post('/api/public/properties/:identifier/refresh-all', async (req, res) => {
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
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
    }
    
    console.log(`[Refresh All] Property found: ${property.property_number}`);
    
    // 全てのデータを並列取得（キャッシュをバイパス）
    const startTime = Date.now();
    
    // PropertyImageServiceのインスタンスを作成
    const propertyImageService = new PropertyImageService(
      60, // cacheTTLMinutes
      parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10),
      parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10),
      parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10)
    );
    
    // storage_locationを取得
    let storageUrl = property.storage_location;
    
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      storageUrl = property.athome_data[0];
    }
    
    // 画像取得の準備（キャッシュクリア）
    if (storageUrl) {
      const folderId = propertyImageService.extractFolderIdFromUrl(storageUrl);
      if (folderId) {
        propertyImageService.clearCache(folderId);
      }
    }
    
    // PropertyDetailsServiceを使用して全データを取得
    const propertyDetailsService = new PropertyDetailsService();
    
    const [images, dbDetails] = await Promise.all([
      // 画像を取得
      (async () => {
        if (!storageUrl) return [];
        const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);
        const hiddenImages = await propertyListingService.getHiddenImages(property.id);
        const filteredImages = result.images.filter(img => !hiddenImages.includes(img.id));
        
        // 最初の画像のURLを取得（データベース更新用）
        if (filteredImages.length > 0) {
          const newImageUrl = filteredImages[0].fullImageUrl;
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
        
        return filteredImages;
      })(),
      
      // PropertyDetailsServiceから全データを取得（キャッシュをクリア）
      (async () => {
        // PropertyDetailsServiceのキャッシュをクリア（内部的に実装されている場合）
        return await propertyDetailsService.getPropertyDetails(property.property_number);
      })(),
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`[Refresh All] All data fetched in ${duration}ms`);
    
    // パノラマURLを取得
    let panoramaUrl = null;
    if (dbDetails.athome_data && Array.isArray(dbDetails.athome_data) && dbDetails.athome_data.length > 1) {
      panoramaUrl = dbDetails.athome_data[1] || null;
    }
    
    res.json({
      success: true,
      data: {
        property,
        images,
        recommendedComments: dbDetails.recommended_comments,
        favoriteComment: dbDetails.favorite_comment,
        athomeData: dbDetails.athome_data,
        panoramaUrl,
        propertyAbout: dbDetails.property_about
      },
      message: '全てのデータを更新しました（データベースにも保存しました）'
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
    console.log(`[Estimate PDF] Environment check:`, {
      hasGoogleServiceAccountJson: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      googleServiceAccountJsonLength: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0,
      hasGoogleServiceAccountKeyPath: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      nodeEnv: process.env.NODE_ENV,
    });
    
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
      name: error.name,
    });
    
    // より詳細なエラーメッセージを返す
    let userMessage = '概算書の生成に失敗しました';
    if (error.message?.includes('Quota exceeded')) {
      userMessage = 'Google Sheets APIのクォータを超過しました。しばらく待ってから再度お試しください。';
    } else if (error.message?.includes('タイムアウト')) {
      userMessage = '計算がタイムアウトしました。もう一度お試しください。';
    } else if (error.message?.includes('認証')) {
      userMessage = 'Google Sheetsの認証に失敗しました。管理者にお問い合わせください。';
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    
    // 買主番号を採番（スプレッドシートベース：一番下の行+1）
    let nextBuyerNumber = 1;
    
    try {
      console.log('[Inquiry API] Getting buyer number from spreadsheet...');
      
      // 環境変数の詳細ログ
      const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID || '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
      const sheetName = process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト';
      
      console.log('[Inquiry API] Environment check:', {
        hasGoogleServiceAccountJson: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        googleServiceAccountJsonLength: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0,
        spreadsheetId: spreadsheetId,
        spreadsheetIdType: typeof spreadsheetId,
        spreadsheetIdLength: spreadsheetId?.length || 0,
        sheetName: sheetName,
      });
      
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: spreadsheetId,
        sheetName: sheetName,
      });
      
      console.log('[Inquiry API] Calling authenticate()...');
      await sheetsClient.authenticate();
      console.log('[Inquiry API] Authentication completed successfully');
      
      // 最後の行だけを取得（高速）
      console.log('[Inquiry API] Calling getLastRow()...');
      const lastRow = await sheetsClient.getLastRow();
      
      console.log('[Inquiry API] Last row from spreadsheet:', lastRow);
      
      if (lastRow) {
        const lastBuyerNumber = lastRow['買主番号'];
        console.log('[Inquiry API] Last buyer number value:', lastBuyerNumber);
        console.log('[Inquiry API] Last row keys:', Object.keys(lastRow));
        
        if (lastBuyerNumber) {
          nextBuyerNumber = parseInt(String(lastBuyerNumber)) + 1;
          console.log('[Inquiry API] Last buyer number from spreadsheet:', lastBuyerNumber);
        } else {
          console.log('[Inquiry API] 買主番号 key not found in last row');
        }
      } else {
        console.log('[Inquiry API] Last row is null');
      }
      
      console.log('[Inquiry API] Next buyer number:', nextBuyerNumber);
    } catch (error: any) {
      console.error('[Inquiry API] Failed to get buyer number from spreadsheet:', error.message);
      console.error('[Inquiry API] Error stack:', error.stack);
      // フォールバック: データベースから取得
      const { data: latestInquiry } = await supabase
        .from('property_inquiries')
        .select('buyer_number')
        .not('buyer_number', 'is', null)
        .order('buyer_number', { ascending: false })
        .limit(1)
        .single();
      
      if (latestInquiry?.buyer_number) {
        nextBuyerNumber = latestInquiry.buyer_number + 1;
        console.log('[Inquiry API] Next buyer number from database:', nextBuyerNumber);
      } else {
        nextBuyerNumber = 1;
        console.log('[Inquiry API] No buyer numbers found, starting from 1');
      }
    }
    
    let sheetSyncStatus = 'synced';
    
    // スプレッドシートに同期（同期的に実行）
    try {
      console.log('[Inquiry API] Starting spreadsheet sync...');
      
      // 環境変数の詳細ログ
      const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID || '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
      const sheetName = process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト';
      
      console.log('[Inquiry API] Sync environment check:', {
        spreadsheetId: spreadsheetId,
        spreadsheetIdType: typeof spreadsheetId,
        spreadsheetIdLength: spreadsheetId?.length || 0,
        sheetName: sheetName,
      });
      
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: spreadsheetId,
        sheetName: sheetName,
      });
      
      await sheetsClient.authenticate();
      console.log('[Inquiry API] Google Sheets authenticated');
      
      // 電話番号を正規化
      const normalizedPhone = phone.replace(/[^0-9]/g, '');
      
      // 現在時刻をJST（日本時間）で取得
      const nowUtc = new Date();
      const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
      const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);
      
      // 受付日（今日の日付、YYYY/MM/DD形式）
      const receptionDate = jstDate.toISOString().substring(0, 10).replace(/-/g, '/');
      
      // スプレッドシートに追加
      const rowData = {
        '買主番号': nextBuyerNumber.toString(),
        '作成日時': jstDateString,
        '●氏名・会社名': name,
        '●問合時ヒアリング': message,
        '●電話番号\n（ハイフン不要）': normalizedPhone,
        '受付日': receptionDate,
        '●メアド': email,
        '●問合せ元': 'いふう独自サイト',
        '物件番号': propertyNumber || '',
        '【問合メール】電話対応': '未',
      };
      
      await sheetsClient.appendRow(rowData);
      console.log('[Inquiry API] Spreadsheet sync completed successfully');
      
    } catch (syncError: any) {
      console.error('[Inquiry API] Spreadsheet sync error:', syncError);
      sheetSyncStatus = 'failed';
      // エラーが発生してもデータベースには保存する
    }
    
    // データベースに保存
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
    
    console.log('[Inquiry API] Saved to database with status:', sheetSyncStatus);
    
    // ユーザーに成功を返す
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
    
    // ⚠️ Vercel Cron Jobsは内部的に実行されるため、認証チェックは不要
    // 外部からのアクセスを防ぐため、Vercel Dashboardで設定する
    
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
    
    // Google Sheets認証（環境変数から自動的に読み込まれる）
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
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
        
        // 受付日（今日の日付、YYYY/MM/DD形式）
        const receptionDate = jstDate.toISOString().substring(0, 10).replace(/-/g, '/');
        
        // スプレッドシートに追加
        const rowData = {
          '買主番号': nextBuyerNumber.toString(),
          '作成日時': jstDateString,
          '●氏名・会社名': inquiry.name,
          '●問合時ヒアリング': inquiry.message,
          '●電話番号\n（ハイフン不要）': normalizedPhone,
          '受付日': receptionDate,
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

// Cron Job: 物件リストをスプレッドシートから同期（15分ごとに実行）
app.get('/api/cron/sync-property-listings', async (req, res) => {
  try {
    console.log('[Cron] Starting property listings sync job...');
    
    // ⚠️ Vercel Cron Jobsは内部的に実行されるため、認証チェックは不要
    // 外部からのアクセスを防ぐため、Vercel Dashboardで設定する
    
    // PropertyListingSyncServiceを使用してフル同期を実行
    const { getPropertyListingSyncService } = await import('./src/services/PropertyListingSyncService');
    const syncService = getPropertyListingSyncService();
    await syncService.initialize();
    
    console.log('[Cron] Running property listings sync...');
    const result = await syncService.runFullSync('scheduled');
    
    console.log(`[Cron] Property listings sync job completed:`, {
      success: result.success,
      added: result.successfullyAdded,
      updated: result.successfullyUpdated,
      failed: result.failed,
      duration: result.endTime.getTime() - result.startTime.getTime(),
    });
    
    res.status(200).json({
      success: result.success,
      totalProcessed: result.totalProcessed,
      successfullyAdded: result.successfullyAdded,
      successfullyUpdated: result.successfullyUpdated,
      failed: result.failed,
      errors: result.errors,
      duration: result.endTime.getTime() - result.startTime.getTime(),
      syncedAt: result.endTime.toISOString(),
    });
    
  } catch (error: any) {
    console.error('[Cron] Error in property listings sync job:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 手動同期エンドポイント（第3層）- コメントデータの緊急同期用
app.post('/api/admin/sync-comments/:propertyNumber', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    
    console.log(`[Manual Sync] Syncing comments for ${propertyNumber}...`);
    
    // 物件情報を取得
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('property_type')
      .eq('property_number', propertyNumber)
      .single();
    
    if (propertyError || !property) {
      console.error(`[Manual Sync] Property not found: ${propertyNumber}`);
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        propertyNumber
      });
    }
    
    // AthomeSheetSyncServiceを使用して同期
    const athomeSheetSyncService = new AthomeSheetSyncService();
    // 日本語の物件種別を英語に変換
    const englishPropertyType = convertPropertyTypeToEnglish(property.property_type);
    console.log(`[Manual Sync] Property type conversion: "${property.property_type}" -> "${englishPropertyType}"`);
    
    if (!englishPropertyType) {
      console.error(`[Manual Sync] Invalid property type: "${property.property_type}"`);
      return res.status(400).json({
        success: false,
        error: `Invalid property type: "${property.property_type}"`,
        propertyNumber
      });
    }
    
    const syncSuccess = await athomeSheetSyncService.syncPropertyComments(
      propertyNumber,
      englishPropertyType
    );
    
    if (syncSuccess) {
      console.log(`[Manual Sync] ✅ Successfully synced comments for ${propertyNumber}`);
      res.json({
        success: true,
        message: `Successfully synced comments for ${propertyNumber}`,
        propertyNumber
      });
    } else {
      console.error(`[Manual Sync] ❌ Failed to sync comments for ${propertyNumber}`);
      res.status(500).json({
        success: false,
        error: 'Failed to sync comments from spreadsheet',
        propertyNumber
      });
    }
  } catch (error: any) {
    console.error('[Manual Sync] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 一括手動同期エンドポイント - 複数物件のコメントデータを同期
app.post('/api/admin/sync-comments-batch', async (req, res) => {
  try {
    const { propertyNumbers } = req.body;
    
    if (!Array.isArray(propertyNumbers) || propertyNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'propertyNumbers must be a non-empty array'
      });
    }
    
    console.log(`[Batch Sync] Syncing comments for ${propertyNumbers.length} properties...`);
    
    const results = {
      success: 0,
      failed: 0,
      details: [] as any[]
    };
    
    for (const propertyNumber of propertyNumbers) {
      try {
        // 物件情報を取得
        const { data: property, error: propertyError } = await supabase
          .from('property_listings')
          .select('property_type')
          .eq('property_number', propertyNumber)
          .single();
        
        if (propertyError || !property) {
          console.error(`[Batch Sync] Property not found: ${propertyNumber}`);
          results.failed++;
          results.details.push({
            propertyNumber,
            success: false,
            error: 'Property not found'
          });
          continue;
        }
        
        // AthomeSheetSyncServiceを使用して同期
        const athomeSheetSyncService = new AthomeSheetSyncService();
        // 日本語の物件種別を英語に変換
        const englishPropertyType = convertPropertyTypeToEnglish(property.property_type);
        console.log(`[Batch Sync] Property type conversion: "${property.property_type}" -> "${englishPropertyType}"`);
        
        if (!englishPropertyType) {
          console.error(`[Batch Sync] ❌ ${propertyNumber}: Invalid property type "${property.property_type}"`);
          results.failed++;
          results.details.push({
            propertyNumber,
            success: false,
            error: `Invalid property type: "${property.property_type}"`
          });
          continue;
        }
        
        const syncSuccess = await athomeSheetSyncService.syncPropertyComments(
          propertyNumber,
          englishPropertyType
        );
        
        if (syncSuccess) {
          console.log(`[Batch Sync] ✅ ${propertyNumber}: Success`);
          results.success++;
          results.details.push({
            propertyNumber,
            success: true
          });
        } else {
          console.error(`[Batch Sync] ❌ ${propertyNumber}: Failed`);
          results.failed++;
          results.details.push({
            propertyNumber,
            success: false,
            error: 'Failed to sync from spreadsheet'
          });
        }
      } catch (error: any) {
        console.error(`[Batch Sync] ❌ ${propertyNumber}: ${error.message}`);
        results.failed++;
        results.details.push({
          propertyNumber,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`[Batch Sync] Completed: ${results.success} success, ${results.failed} failed`);
    
    res.json({
      success: results.failed === 0,
      message: `Synced ${results.success}/${propertyNumbers.length} properties`,
      results
    });
  } catch (error: any) {
    console.error('[Batch Sync] Error:', error.message);
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
