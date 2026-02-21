// 業務管理システム用の認証ルート
import { Router, Request, Response } from 'express';
import { supabaseClient } from '../config/supabase';

const router = Router();

// 認証コールバック
router.post('/callback', async (req: Request, res: Response) => {
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
    
    // Supabase Authでセッションを設定してユーザー情報を取得
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
    
    // employeesテーブルから社員情報を取得
    let { data: employee, error: employeeError } = await supabaseClient
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
      const { data: newEmployee, error: createError } = await supabaseClient
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
});

// 認証確認
router.get('/me', async (req: Request, res: Response) => {
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
    
    // トークンを検証してユーザー情報を取得
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid or expired authentication token',
          retryable: false,
        },
      });
    }
    
    // 社員情報を取得
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();
    
    if (employeeError || !employee) {
      return res.status(401).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Employee record not found',
          retryable: false,
        },
      });
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
});

export default router;
