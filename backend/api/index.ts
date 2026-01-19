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
    
    console.log('📊 Query params:', { limit, offset, propertyNumber, location, types, minPrice, maxPrice, minAge, maxAge, showPublicOnly });
    
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

// 公開物件の完全な詳細情報取得（画像含む、atbb_statusでフィルタリングしない）
app.get('/api/public/properties/:propertyIdentifier/complete', async (req, res) => {
  try {
    const { propertyIdentifier } = req.params;
    console.log(`🔍 Fetching complete property details for: ${propertyIdentifier}`);
    
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

    console.log(`✅ Found complete property details: ${propertyIdentifier} (${property.property_number})`);

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
    console.error('❌ Error fetching complete property details:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Failed to fetch complete property details from database'
    });
  }
});

// 公開物件の画像一覧取得（UUIDまたは物件番号で検索）
// Google Driveから動的に画像を取得
app.get('/api/public/properties/:propertyIdentifier/images', async (req, res) => {
  try {
    const { propertyIdentifier } = req.params;
    console.log(`🔍 Fetching images for: ${propertyIdentifier}`);
    
    // UUIDか物件番号かを判定（UUIDは36文字のハイフン付き形式）
    const isUuid = propertyIdentifier.length === 36 && propertyIdentifier.includes('-');
    
    // データベースから物件情報を取得（storage_locationとproperty_numberが必要）
    let query = supabase
      .from('property_listings')
      .select('id, property_number, storage_location');
    
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

    console.log(`📂 Property found: ${property.property_number}, storage_location: ${property.storage_location || 'なし'}`);

    // GoogleDriveServiceを使用して画像を取得
    try {
      const driveService = new GoogleDriveService();
      
      const imageData = await driveService.getImagesFromAthomePublicFolder(
        property.storage_location,
        property.property_number
      );

    // 画像データをフロントエンドが期待する形式に変換
    // プロキシエンドポイントを使用してバックエンド経由で画像を取得
    // 本番環境では固定のVercel URLを使用
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://baikyaku-property-site3.vercel.app'
      : (process.env.API_BASE_URL || 'http://localhost:3000');
    
    console.log(`🔗 Using base URL: ${baseUrl}`);
    
      const images = imageData.map((img) => ({
        id: img.id,
        url: `${baseUrl}/api/public/images/proxy/${img.id}`,
        fullImageUrl: `${baseUrl}/api/public/images/proxy/${img.id}`,
        thumbnailUrl: `${baseUrl}/api/public/images/proxy/${img.id}?thumbnail=true`,
        name: img.name,
        isHidden: false
      }));

      console.log(`✅ Found ${images.length} images for ${propertyIdentifier} (${property.property_number})`);

      res.json({ 
        success: true, 
        images: images,
        hiddenImages: [] // 公開サイトでは非表示画像なし
      });
    } catch (driveError: any) {
      console.error('❌ Error fetching images from Google Drive:', driveError);
      // 画像取得に失敗しても空配列を返す（エラーにしない）
      res.json({ 
        success: true, 
        images: [],
        hiddenImages: []
      });
    }
  } catch (error: any) {
    console.error('❌ Error fetching property images:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Failed to fetch property images from Google Drive'
    });
  }
});

// 画像プロキシエンドポイント（Google Driveの画像をバックエンド経由で取得）
app.get('/api/public/images/proxy/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const thumbnail = req.query.thumbnail === 'true';
    
    console.log(`🖼️ Proxying image: ${fileId} (thumbnail: ${thumbnail})`);
    
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
    
    console.log(`✅ Image proxied successfully: ${fileId}`);
  } catch (error: any) {
    console.error('❌ Error proxying image:', error);
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

// 公開物件サイト用のルートは後で追加
// app.use('/api/public', publicPropertiesRoutes);
// app.use('/api/public/inquiries', publicInquiriesRoutes);


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
