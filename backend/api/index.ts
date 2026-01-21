// Vercel用のエントリーポイント（最小構成 + 認証 + 画像）
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
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// サービスロールキー（管理操作用）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 匿名キー（トークン検証用）
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'https://property-site-frontend-kappa.vercel.app',
    'https://baikyaku-property-site3.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// OPTIONSリクエスト（プリフライト）を処理
app.options('*', (_req, res) => {
  res.status(200).end();
});

// 公開物件一覧取得
app.get('/api/public/properties', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const { data: properties, error, count } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ 
      success: true, 
      properties: properties || [],
      pagination: { total: count || 0, limit, offset, hasMore: (count || 0) > offset + limit }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 公開物件詳細取得
app.get('/api/public/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isUuid = id.length === 36 && id.includes('-');
    
    let query = supabase.from('property_listings').select('*');
    query = isUuid ? query.eq('id', id) : query.eq('property_number', id);
    
    const { data: property, error } = await query.single();
    if (error) throw error;
    if (!property) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({ success: true, property });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 完全な物件詳細取得
app.get('/api/public/properties/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const isUuid = id.length === 36 && id.includes('-');
    
    let query = supabase.from('property_listings').select('*');
    query = isUuid ? query.eq('id', id) : query.eq('property_number', id);
    
    const { data: property, error } = await query.single();
    if (error) throw error;
    if (!property) return res.status(404).json({ success: false, error: 'Not found' });

    // property_detailsテーブルから追加情報を取得
    const { data: details } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', property.property_number)
      .single();

    res.json({
      property,
      favoriteComment: details?.favorite_comment || null,
      recommendedComments: details?.recommended_comments || null,
      athomeData: details?.athome_data || null,
      propertyAbout: details?.property_about || null,
      settlementDate: null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Google Drive APIヘルパー関数
async function getGoogleDriveAuth() {
  const { google } = await import('googleapis');
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  
  return auth;
}

async function listImagesFromDriveFolder(folderUrl: string) {
  const { google } = await import('googleapis');
  
  // フォルダIDを抽出
  const folderIdMatch = folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (!folderIdMatch) {
    throw new Error('Invalid folder URL');
  }
  const folderId = folderIdMatch[1];
  
  const auth = await getGoogleDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  
  // フォルダ内の画像ファイルを取得
  const response = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType = 'application/pdf') and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, thumbnailLink)',
    orderBy: 'name',
  });
  
  const files = response.data.files || [];
  
  return files.map(file => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
    url: `https://drive.google.com/file/d/${file.id}/view`,
    thumbnailUrl: file.thumbnailLink || null,
  }));
}

// 画像一覧取得（storage_locationから）
app.get('/api/public/properties/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    const { includeHidden = 'false' } = req.query;
    const isUuid = id.length === 36 && id.includes('-');
    
    let query = supabase.from('property_listings').select('storage_location, hidden_images, athome_data');
    query = isUuid ? query.eq('id', id) : query.eq('property_number', id);
    
    const { data: property, error } = await query.single();
    if (error) throw error;
    if (!property) return res.status(404).json({ success: false, error: 'Not found' });

    // storage_locationを優先、なければathome_dataから取得
    let storageUrl = property.storage_location;
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      storageUrl = property.athome_data[0];
    }

    if (!storageUrl) {
      return res.json({
        success: true,
        images: [],
        totalCount: 0,
        visibleCount: 0,
        hiddenCount: 0,
      });
    }

    // Google Driveから画像を取得
    const images = await listImagesFromDriveFolder(storageUrl);

    // 非表示画像をフィルタリング
    const hiddenImages = property.hidden_images || [];
    const visibleImages = includeHidden === 'true' 
      ? images 
      : images.filter(img => !hiddenImages.includes(img.id));

    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      success: true,
      images: visibleImages,
      totalCount: images.length,
      visibleCount: visibleImages.length,
      hiddenCount: hiddenImages.length,
    });
  } catch (error: any) {
    console.error('Error fetching images:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 画像プロキシ（Google Driveから画像データを取得）
app.get('/api/public/images/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { google } = await import('googleapis');
    
    const auth = await getGoogleDriveAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    // ファイルのメタデータを取得
    const metadata = await drive.files.get({
      fileId,
      fields: 'mimeType, size',
    });
    
    // ファイルデータを取得
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    res.set({
      'Content-Type': metadata.data.mimeType || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    
    res.send(Buffer.from(response.data as ArrayBuffer));
  } catch (error: any) {
    console.error('Error proxying image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 画像サムネイルプロキシ
app.get('/api/public/images/:fileId/thumbnail', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { google } = await import('googleapis');
    
    const auth = await getGoogleDriveAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    // ファイルのメタデータを取得
    const metadata = await drive.files.get({
      fileId,
      fields: 'mimeType, size',
    });
    
    // ファイルデータを取得（サムネイルも同じデータを使用）
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    res.set({
      'Content-Type': metadata.data.mimeType || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    
    res.send(Buffer.from(response.data as ArrayBuffer));
  } catch (error: any) {
    console.error('Error proxying thumbnail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// 認証エンドポイント
// ========================================

function isInvalidName(name: string): boolean {
  if (!name || name.trim().length === 0) return true;
  if (name === '不明' || name === 'Unknown') return true;
  const base64Pattern = /^[A-Za-z0-9+/=]{20,}$/;
  if (base64Pattern.test(name)) return true;
  if (name.includes('@')) return true;
  return false;
}

function extractDisplayName(userMetadata: any, email: string): string {
  if (userMetadata?.full_name) return userMetadata.full_name;
  if (userMetadata?.name) return userMetadata.name;
  const emailPrefix = email.split('@')[0];
  return emailPrefix || '不明';
}

app.post('/auth/callback', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'アクセストークンが必要です', retryable: false },
      });
    }

    const { data: { user }, error } = await supabaseClient.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });

    if (error || !user || !user.email) {
      return res.status(401).json({
        error: { code: 'AUTH_ERROR', message: '認証エラー', retryable: false },
      });
    }

    const extractedName = extractDisplayName(user.user_metadata, user.email);
    
    const { data: existing, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .eq('google_id', user.id)
      .single();

    let employee;
    
    if (existing && !fetchError) {
      const shouldUpdateName = isInvalidName(existing.name);
      
      if (shouldUpdateName) {
        await supabase
          .from('employees')
          .update({ name: extractedName, last_login_at: new Date().toISOString() })
          .eq('id', existing.id);
        employee = { ...existing, name: extractedName };
      } else {
        await supabase
          .from('employees')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', existing.id);
        employee = existing;
      }
    } else {
      const { data: newEmployee, error: createError } = await supabase
        .from('employees')
        .insert({
          google_id: user.id,
          email: user.email,
          name: extractedName,
          role: 'agent',
          is_active: true,
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newEmployee) {
        throw new Error('Failed to create employee');
      }
      employee = newEmployee;
    }

    res.json({ employee, access_token, refresh_token });
  } catch (error: any) {
    res.status(500).json({
      error: { code: 'AUTH_ERROR', message: error.message || '認証に失敗しました', retryable: true },
    });
  }
});

app.post('/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabase.auth.admin.signOut(token);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({
      error: { code: 'LOGOUT_ERROR', message: 'Failed to logout', retryable: true },
    });
  }
});

app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'AUTH_ERROR', message: 'No authentication token provided', retryable: false },
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error('Invalid or expired session');
    }

    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('google_id', user.id)
      .eq('is_active', true)
      .single();

    if (employeeError || !employee) {
      throw new Error('Employee not found or inactive');
    }
    
    res.json(employee);
  } catch (error) {
    res.status(401).json({
      error: { code: 'AUTH_ERROR', message: 'Invalid or expired authentication token', retryable: false },
    });
  }
});

app.post('/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Refresh token is required', retryable: false },
      });
    }

    const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      return res.status(401).json({
        error: { code: 'AUTH_ERROR', message: 'Invalid refresh token', retryable: false },
      });
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    res.status(401).json({
      error: { code: 'AUTH_ERROR', message: 'Failed to refresh token', retryable: false },
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred', retryable: false },
  });
});

// Vercel用のハンドラー
export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any);
};
