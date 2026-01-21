// Vercel用のエントリーポイント（最小構成 + 段階的に機能追加）
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

// ========================================
// 認証エンドポイント
// ========================================

/**
 * 名前が無効かどうかをチェック
 */
function isInvalidName(name: string): boolean {
  if (!name || name.trim().length === 0) return true;
  if (name === '不明' || name === 'Unknown') return true;
  
  // 暗号化されたような文字列をチェック（Base64パターン）
  const base64Pattern = /^[A-Za-z0-9+/=]{20,}$/;
  if (base64Pattern.test(name)) return true;
  
  // メールアドレスそのものが名前になっている場合
  if (name.includes('@')) return true;
  
  return false;
}

/**
 * 表示名を抽出
 */
function extractDisplayName(userMetadata: any, email: string): string {
  if (userMetadata?.full_name) return userMetadata.full_name;
  if (userMetadata?.name) return userMetadata.name;
  
  // メールアドレスから名前を抽出
  const emailPrefix = email.split('@')[0];
  return emailPrefix || '不明';
}

/**
 * Supabase Authのコールバック処理
 */
app.post('/auth/callback', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      console.log('🔵 /auth/callback called');
      console.log('🔵 Has access_token:', !!access_token);
      console.log('🔵 Has refresh_token:', !!refresh_token);
    }

    if (!access_token) {
      console.error('❌ No access token provided');
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'アクセストークンが必要です',
          retryable: false,
        },
      });
    }

    // トークンからユーザー情報を取得
    if (isDev) {
      console.log('🔵 Verifying token with Supabase...');
    }
    
    const { data: { user }, error } = await supabaseClient.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });

    if (isDev) {
      console.log('🔵 Session result:', { 
        hasUser: !!user, 
        userId: user?.id,
        userEmail: user?.email,
        error: error?.message 
      });
    }

    if (error) {
      console.error('❌ Supabase session error:', error.message);
      return res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: `認証エラー: ${error.message}`,
          retryable: false,
        },
      });
    }

    if (!user) {
      console.error('❌ No user found in session');
      return res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: '無効なアクセストークンです',
          retryable: false,
        },
      });
    }

    if (!user.email) {
      console.error('❌ User has no email');
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ユーザーのメールアドレスが取得できません',
          retryable: false,
        },
      });
    }

    // 社員レコードを取得または作成
    if (isDev) {
      console.log('🔵 Creating/getting employee record...');
    }
    
    const extractedName = extractDisplayName(user.user_metadata, user.email);
    
    // 既存の社員を検索
    const { data: existing, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .eq('google_id', user.id)
      .single();

    let employee;
    
    if (existing && !fetchError) {
      // 既存の名前が無効な場合は更新する
      const shouldUpdateName = isInvalidName(existing.name);
      
      if (shouldUpdateName) {
        await supabase
          .from('employees')
          .update({
            name: extractedName,
            last_login_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        employee = { ...existing, name: extractedName, lastLoginAt: new Date() };
      } else {
        // 最終ログイン日時のみ更新
        await supabase
          .from('employees')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', existing.id);

        employee = { ...existing, lastLoginAt: new Date() };
      }
    } else {
      // 新規社員を作成
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
        console.error('[Auth] Failed to create employee:', createError);
        throw new Error('Failed to create employee');
      }

      employee = newEmployee;
    }

    if (isDev) {
      console.log('✅ Employee record created/retrieved:', {
        id: employee.id,
        name: employee.name,
        email: employee.email,
      });
    }

    res.json({
      employee,
      access_token,
      refresh_token,
    });
  } catch (error: any) {
    console.error('❌ Auth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : '認証に失敗しました';
    
    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: errorMessage,
        retryable: true,
      },
    });
  }
});

/**
 * ログアウト
 */
app.post('/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabase.auth.admin.signOut(token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: {
        code: 'LOGOUT_ERROR',
        message: 'Failed to logout',
        retryable: true,
      },
    });
  }
});

/**
 * 現在のユーザー情報取得
 */
app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'No authentication token provided',
          retryable: false,
        },
      });
    }

    const token = authHeader.substring(7);
    
    // Supabase Authでトークンを検証
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error('Invalid or expired session');
    }

    // 社員情報を取得
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
    console.error('Get me error:', error);
    res.status(401).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Invalid or expired authentication token',
        retryable: false,
      },
    });
  }
});

/**
 * トークンリフレッシュ
 */
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
          retryable: false,
        },
      });
    }

    // Supabase Authでトークンをリフレッシュ
    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      return res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid refresh token',
          retryable: false,
        },
      });
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Failed to refresh token',
        retryable: false,
      },
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

// Vercel用のハンドラー
export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any);
};
