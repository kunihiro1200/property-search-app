/**
 * Vercel環境変数テストエンドポイント
 * 
 * 本番環境で環境変数が正しく設定されているかを確認するためのエンドポイント
 * https://baikyaku-property-site3.vercel.app/api/test-env でアクセス可能
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 環境変数の存在確認（値は表示しない）
    const envStatus = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      GOOGLE_SERVICE_ACCOUNT_JSON: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      GOOGLE_SHEETS_SPREADSHEET_ID: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      GOOGLE_SHEETS_SHEET_NAME: !!process.env.GOOGLE_SHEETS_SHEET_NAME,
      GOOGLE_SHEETS_PROPERTY_SPREADSHEET_ID: !!process.env.GOOGLE_SHEETS_PROPERTY_SPREADSHEET_ID,
      GOOGLE_SHEETS_BUYER_SPREADSHEET_ID: !!process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID,
      GOOGLE_SHEETS_WORK_TASK_SPREADSHEET_ID: !!process.env.GOOGLE_SHEETS_WORK_TASK_SPREADSHEET_ID,
    };

    // Supabase接続テスト
    let supabaseTest = {
      connected: false,
      sellersCount: 0,
      propertiesCount: 0,
      buyersCount: 0,
      workTasksCount: 0,
      error: null as string | null,
    };

    try {
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase環境変数が設定されていません');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // 各テーブルの件数を取得
      const [sellers, properties, buyers, workTasks] = await Promise.all([
        supabase.from('sellers').select('*', { count: 'exact', head: true }),
        supabase.from('property_listings').select('*', { count: 'exact', head: true }),
        supabase.from('buyers').select('*', { count: 'exact', head: true }),
        supabase.from('work_tasks').select('*', { count: 'exact', head: true }),
      ]);
      
      supabaseTest = {
        connected: true,
        sellersCount: sellers.count || 0,
        propertiesCount: properties.count || 0,
        buyersCount: buyers.count || 0,
        workTasksCount: workTasks.count || 0,
        error: null,
      };
    } catch (error: any) {
      supabaseTest.error = error.message;
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      envVariables: envStatus,
      supabase: supabaseTest,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
