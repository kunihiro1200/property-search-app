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
app.get('/api/public/properties', async (_req, res) => {
  try {
    console.log('🔍 Fetching all properties from database...');
    
    // データベースから全ての物件を取得（atbb_statusでフィルタリングしない）
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log(`✅ Found ${properties?.length || 0} properties`);

    // image_urlをimagesに変換
    const transformedProperties = properties?.map(property => {
      let images = [];
      if (property.image_url) {
        try {
          images = JSON.parse(property.image_url);
        } catch (e) {
          console.error(`Failed to parse image_url for ${property.property_number}:`, e);
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
      count: transformedProperties?.length || 0
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
app.get('/api/public/properties/:propertyNumber', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    console.log(`🔍 Fetching property details for: ${propertyNumber}`);
    
    // データベースから物件詳細を取得（atbb_statusでフィルタリングしない）
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();

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

    console.log(`✅ Found property: ${propertyNumber}`);

    // image_urlをimagesに変換
    let images = [];
    if (property.image_url) {
      try {
        images = JSON.parse(property.image_url);
      } catch (e) {
        console.error(`Failed to parse image_url for ${property.property_number}:`, e);
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
app.get('/api/public/properties/:propertyNumber/complete', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    console.log(`🔍 Fetching complete property details for: ${propertyNumber}`);
    
    // データベースから物件詳細を取得（atbb_statusでフィルタリングしない）
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();

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

    console.log(`✅ Found complete property details: ${propertyNumber}`);

    // image_urlをimagesに変換
    let images = [];
    if (property.image_url) {
      try {
        images = JSON.parse(property.image_url);
      } catch (e) {
        console.error(`Failed to parse image_url for ${property.property_number}:`, e);
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
