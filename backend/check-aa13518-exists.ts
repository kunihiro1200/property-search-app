import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13518() {
  console.log('=== AA13518 データベース確認 ===\n');
  
  // AA13518をseller_numberで直接検索
  const { data, error } = await supabase
    .from('sellers')
    .select('id, seller_number, name, status, created_at, updated_at, property_address, inquiry_date')
    .eq('seller_number', 'AA13518')
    .single();
  
  if (error) {
    console.log('❌ AA13518 はデータベースに存在しません');
    console.log('   エラー:', error.message);
    console.log('\n→ スプレッドシートから同期が必要です');
  } else {
    console.log('✅ AA13518 はデータベースに存在します:');
    console.log('   ID:', data.id);
    console.log('   売主番号:', data.seller_number);
    console.log('   ステータス:', data.status);
    console.log('   物件住所:', data.property_address);
    console.log('   反響日:', data.inquiry_date);
    console.log('   作成日:', data.created_at);
    console.log('   更新日:', data.updated_at);
  }
}

checkAA13518().catch(console.error);
