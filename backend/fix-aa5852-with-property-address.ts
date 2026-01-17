// AA5852の配信エリアを物件所在地から修正
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixAA5852() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== AA5852の配信エリアを修正 ===\n');

  // DBから取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA5852')
    .single();

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  if (!seller) {
    console.log('AA5852が見つかりません');
    return;
  }

  console.log('売主番号:', seller.seller_number);
  console.log('現在のaddressフィールド:', seller.address ? '暗号化済み（福岡市南区塩原）' : '未設定');
  console.log('物件所在地:', seller.property_address || '未設定');
  console.log('現在の配信エリア:', seller.distribution_areas);
  
  // 物件所在地は「大分市大字常行常行180-4」
  // 常行は大分市なので、配信エリアは④と㊵
  const correctAreas = ['④', '㊵'];
  
  console.log('\n物件所在地「大分市大字常行常行180-4」に基づいて配信エリアを修正します');
  console.log('正しい配信エリア: ④（大分市）, ㊵（大分市全域）');
  
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      distribution_areas: correctAreas
    })
    .eq('seller_number', 'AA5852');

  if (updateError) {
    console.error('\n更新エラー:', updateError.message);
    return;
  }

  console.log('\n✓ 配信エリアを修正しました');
  
  // 確認
  const { data: updated } = await supabase
    .from('sellers')
    .select('distribution_areas')
    .eq('seller_number', 'AA5852')
    .single();
  
  console.log('更新後の配信エリア:', updated?.distribution_areas);
  console.log('\n完了！');
}

fixAA5852().catch(console.error);
