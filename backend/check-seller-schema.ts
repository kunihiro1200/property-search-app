import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSellerSchema() {
  console.log('🔍 sellersテーブルのスキーマを確認中...\n');

  // 1件のデータを取得してカラムを確認
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('データが見つかりません');
    return;
  }

  const columns = Object.keys(data[0]);
  console.log('📋 sellersテーブルのカラム一覧:\n');
  columns.sort().forEach((column, index) => {
    console.log(`${index + 1}. ${column}`);
  });

  console.log(`\n合計: ${columns.length} カラム\n`);

  // 必要なフィールドの確認
  const requiredFields = [
    'confidence_level',
    'next_call_date',
    'contract_decision_date',
    'competitor_name',
    'competitor_reason',
    'exclusive_other_decision_reason'
  ];

  console.log('🔍 必要なフィールドの確認:\n');
  requiredFields.forEach(field => {
    const exists = columns.includes(field);
    console.log(`  ${exists ? '✅' : '❌'} ${field}`);
  });
}

checkSellerSchema().catch(console.error);
