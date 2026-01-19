// 公開物件サイト専用のエントリーポイント
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Supabase クライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    // クエリを構築
    let query = supabase
      .from('property_listings')
      .select('*', { count: 'exact' });
    
    // フィルター条件を適用
    if (propertyNumber) {
      query = query.ilike('property_number', `%${propertyNumber}%`);
    }
    
    if (location) {
      query = query.or(`address.ilike.%${location}%,display_address.ilike.%${location}%`);
    }
    
    if (types) {
      const typeArray = types.split(',');
      query = query.in('property_type', typeArray);
    }
    
    if (minPrice !== undefined) {
      query = query.gte('price', minPrice * 10000); // 万円を円に変換
    }
    
    if (maxPrice !== undefined) {
      query = query.lte('price', maxPrice * 10000); // 万円を円に変換
    }
    
    if (minAge !== undefined) {
      query = query.gte('building_age', minAge);
    }
    
    if (maxAge !== undefined) {
      query = query.lte('building_age', maxAge);
    }
    
    if (showPublicOnly) {
      query = query.eq('atbb_status', '公開中');
    }
    
    // ページネーションを適用
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: properties, error, count } = await query;

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log(`✅ Found ${properties?.length || 0} properties (total: ${count})`);

    // image_urlをimagesに変換（JSON配列または単一文字列に対応）
    const transformedProperties = properties?.map(property => {
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
      return {
        ...property,
        images
      };
    });

    res.json({ 
      success: true, 
      properties: transformedProperties || [],
      pagination: {
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        limit: limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching properties:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Failed to fetch properties from database'
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
    const { GoogleDriveService } = await import('../src/services/GoogleDriveService');
    const driveService = new GoogleDriveService();
    
    const imageUrls = await driveService.getImagesFromAthomePublicFolder(
      property.storage_location,
      property.property_number
    );

    // 画像URLをフロントエンドが期待する形式に変換
    const images = imageUrls.map((url, index) => ({
      id: `${property.property_number}-${index}`,
      url: url,
      fullImageUrl: url, // フロントエンドが期待するプロパティ名
      name: `画像${index + 1}`,
      isHidden: false
    }));

    console.log(`✅ Found ${images.length} images for ${propertyIdentifier} (${property.property_number})`);

    res.json({ 
      success: true, 
      images: images,
      hiddenImages: [] // 公開サイトでは非表示画像なし
    });
  } catch (error: any) {
    console.error('❌ Error fetching property images:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Failed to fetch property images from Google Drive'
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
