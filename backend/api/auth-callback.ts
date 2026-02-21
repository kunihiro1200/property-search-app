// 業務管理システム用の認証コールバック専用エンドポイント
// Vercelサーバーレス関数として独立して動作
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントを直接初期化
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORSヘッダーを設定
  const allowedOrigins = [
    'https://new-admin-management-system-v2.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  const origin = req.headers.origin || '';
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  // OPTIONSリクエスト（プリフライト）の処理
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POSTリクエストのみ許可
  if (req.method !== 'POST') {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is allowed',
        retryable: false,
      },
    });
    return;
  }

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
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'アクセストークンが必要です',
          retryable: false,
        },
      });
      return;
    }

    // トークンからユーザー情報を取得
    if (isDev) {
      console.log('🔵 Verifying token with Supabase...');
    }
    
    // Supabase Authでセッションを設定してユーザー情報を取得
    const { data: { user }, error } = await supabase.auth.setSession({
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
      res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: `認証エラー: ${error.message}`,
          retryable: false,
        },
      });
      return;
    }

    if (!user) {
      console.error('❌ No user found in session');
      res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: '無効なアクセストークンです',
          retryable: false,
        },
      });
      return;
    }

    if (!user.email) {
      console.error('❌ User has no email');
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ユーザーのメールアドレスが取得できません',
          retryable: false,
        },
      });
      return;
    }

    // 社員レコードを取得または作成
    if (isDev) {
      console.log('🔵 Creating/getting employee record...');
    }
    
    // employeesテーブルから社員情報を取得
    let { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (employeeError && employeeError.code !== 'PGRST116') {
      // PGRST116 = レコードが見つからない（これは正常）
      console.error('❌ Employee fetch error:', employeeError);
      throw new Error(`社員情報の取得に失敗しました: ${employeeError.message}`);
    }

    // 社員レコードが存在しない場合は作成
    if (!employee) {
      const { data: newEmployee, error: createError } = await supabase
        .from('employees')
        .insert({
          auth_user_id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Employee creation error:', createError);
        throw new Error(`社員レコードの作成に失敗しました: ${createError.message}`);
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

    res.status(200).json({
      employee,
      access_token,
      refresh_token,
    });
  } catch (error) {
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
}
