console.log('🔄 スクリプト開始');

import dotenv from 'dotenv';
dotenv.config();

console.log('✅ dotenv読み込み完了');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');

import { createClient } from '@supabase/supabase-js';

console.log('✅ Supabaseインポート完了');

async function test() {
  console.log('🔄 テスト関数開始');
  
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('✅ Supabaseクライアント作成完了');

  const { data, error } = await supabase
    .from('property_listings')
    .select('id, property_number')
    .eq('property_number', 'CC23')
    .single();

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log('✅ CC23取得成功');
  console.log('UUID:', data.id);
  console.log('物件番号:', data.property_number);
}

test().catch(err => {
  console.error('❌ エラー:', err);
});
