// 業務管理システム用の認証確認専用エンドポイント
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントを直接初期化
// サーバーレス関数ではVITE_プレフィックスなしの環境変数を使用
// フォールバックとしてVITE_プレフィックス付きも試す
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
    }
  });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GETリクエストのみ許可
  if (req.method !== 'GET') {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET method is allowed',
        retryable: false,
      },
    });
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'No authentication token provided',
          retryable: false,
        },
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // トークンを検証してユーザー情報を取得
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid or expired authentication token',
          retryable: false,
        },
      });
      return;
    }
    
    // 社員情報を取得
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();
    
    if (employeeError || !employee) {
      res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Employee record not found',
          retryable: false,
        },
      });
      return;
    }
    
    res.status(200).json(employee);
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
}
