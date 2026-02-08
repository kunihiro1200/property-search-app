import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('=== google_calendar_tokensテーブルの確認（REST API） ===\n');
  
  try {
    // テーブルからデータを取得してみる
    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ エラー:', error);
      console.log('');
      console.log('テーブルが存在しない可能性があります。');
      console.log('');
      console.log('解決方法:');
      console.log('1. Supabase Dashboardにログイン');
      console.log('2. SQL Editorで以下のSQLを実行:');
      console.log('');
      console.log(`
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  encrypted_refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_employee_id 
ON google_calendar_tokens(employee_id);
      `);
      return;
    }
    
    console.log('✅ テーブルは存在します');
    console.log('データ件数:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('');
      console.log('登録済みトークン:');
      for (const token of data) {
        // 従業員情報を取得
        const { data: employee } = await supabase
          .from('employees')
          .select('name, email')
          .eq('id', token.employee_id)
          .single();
        
        console.log(`  - ${employee?.name || 'Unknown'} (${employee?.email || 'No email'})`);
        console.log(`    Employee ID: ${token.employee_id}`);
        console.log(`    Created: ${token.created_at}`);
      }
    } else {
      console.log('');
      console.log('⚠️ トークンが登録されていません');
      console.log('');
      console.log('次のステップ:');
      console.log('1. ブラウザで http://localhost:3000/api/auth/google/calendar にアクセス');
      console.log('2. tenant@ifoo-oita.com でログイン');
      console.log('3. カレンダーへのアクセスを許可');
    }
  } catch (error: any) {
    console.error('エラー:', error);
  }
}

check();
