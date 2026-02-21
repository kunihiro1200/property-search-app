// 業務管理システム用の認証確認専用エンドポイント
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabase認証情報を直接定義（環境変数が読み込めない問題の根本的な解決）
const SUPABASE_URL = 'https://krxhrbtlgfjzsseegaqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeGhyYnRsZ2ZqenNzZWVnYXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjE0MTEsImV4cCI6MjA3ODU5NzQxMX0.xoa5SRDXziVFK0c-uiKgHWCE_b5l4iqqLRSJzgv2cBc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
