/**
 * sellersテーブルのカラムを確認
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkSellersColumns() {
  console.log('🔍 sellersテーブルのカラムを確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // カラム情報を取得
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ sellersテーブルのカラム:');
    console.log(Object.keys(data[0]).sort().join('\n'));
  } else {
    console.log('⚠️  データが見つかりません');
  }
}

checkSellersColumns();
