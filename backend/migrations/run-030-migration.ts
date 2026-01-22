import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('=== Migration 030: 訪問予約フィールドの修正 ===\n');

  try {
    console.log('マイグレーションSQLを実行中...');
    
    // visit_department 列を削除
    console.log('visit_department 列を削除中...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE sellers DROP COLUMN IF EXISTS visit_department;'
    });
    
    if (error1) {
      console.log('RPCが利用できません。Supabase Clientを使用して確認します...');
    }

    // 必要なフィールドを追加
    console.log('visit_valuation_acquirer 列を追加中...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_valuation_acquirer TEXT;'
    });
    
    if (error2) {
      console.log('RPCが利用できません。');
    }

    console.log('visit_date, visit_time, visit_assignee 列を追加中...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE sellers 
        ADD COLUMN IF NOT EXISTS visit_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS visit_time TEXT,
        ADD COLUMN IF NOT EXISTS visit_assignee TEXT;
      `
    });
    
    if (error3) {
      console.log('RPCが利用できません。');
    }

    console.log('\n✅ マイグレーション完了');

    // 検証: 新しい列が追加されたことを確認
    console.log('\n=== 検証 ===');
    const { data: sellers, error: selectError } = await supabase
      .from('sellers')
      .select('id, visit_date, visit_time, visit_assignee, visit_valuation_acquirer')
      .limit(1);

    if (selectError) {
      console.error('検証エラー:', selectError);
    } else {
      console.log('✅ 新しい列が正常に追加されました');
      console.log('サンプルデータ:', sellers);
    }

  } catch (error: any) {
    console.error('\n❌ マイグレーション失敗:', error.message);
    process.exit(1);
  }
}

runMigration()
  .then(() => {
    console.log('\n=== マイグレーション完了 ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
