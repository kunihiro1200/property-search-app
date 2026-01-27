import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

// 環境変数を確認
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSellersSchema() {
  console.log('=== sellersテーブルのスキーマ確認 ===\n');
  
  // 1件だけ取得してカラム名を確認
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }
  
  console.log('📊 sellersテーブルのカラム一覧:');
  const columns = Object.keys(data);
  columns.sort();
  
  // 査定額関連のカラムを探す
  const valuationColumns = columns.filter(col => 
    col.includes('valuation') || col.includes('査定')
  );
  
  console.log('\n🔍 査定額関連のカラム:');
  valuationColumns.forEach(col => {
    console.log(`  - ${col}: ${data[col]}`);
  });
  
  console.log('\n📋 全カラム一覧:');
  columns.forEach(col => {
    console.log(`  - ${col}`);
  });
}

checkSellersSchema().catch(console.error);
