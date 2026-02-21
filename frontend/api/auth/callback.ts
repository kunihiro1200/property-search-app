// 業務管理システム用の認証コールバック専用エンドポイント
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントを直接初期化
// サーバーレス関数ではVITE_プレフィックスなしの環境変数を使用
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // Supabase Authでセッションを設定してユーザー情報を取得
    const { data: { user }, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });

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

    // employeesテーブルから社員情報を取得
    let { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (employeeError && employeeError.code !== 'PGRST116') {
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
