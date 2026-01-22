// AA5852の配信エリアを修正
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from './src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixAA5852() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== AA5852の配信エリア修正 ===\n');

  // DBから取得
  const { data: property, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA5852')
    .single();

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  if (!property) {
    console.log('AA5852が見つかりません');
    return;
  }

  console.log('売主番号:', property.seller_number);
  
  // 住所を復号化
  let address = property.address;
  if (address) {
    try {
      address = decrypt(address);
      console.log('住所:', address);
    } catch (e) {
      console.log('住所（復号化失敗）:', address);
    }
  }
  
  console.log('現在の配信エリア:', property.distribution_areas);
  
  // 常行は大分市なので、④と㊵を設定
  const correctAreas = ['④', '㊵'];
  
  // 住所を確認して、本当に常行かチェック
  if (!address || !address.includes('常行')) {
    console.log('\n⚠️ 警告: この物件は常行ではありません！');
    console.log('住所:', address);
    console.log('配信エリアの自動計算が必要です。');
    return;
  }
  
  console.log('\n配信エリアを修正中...');
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      distribution_areas: correctAreas
    })
    .eq('seller_number', 'AA5852');

  if (updateError) {
    console.error('更新エラー:', updateError.message);
    return;
  }

  console.log('✓ 配信エリアを修正しました');
  console.log('新しい配信エリア:', correctAreas);
  
  // 確認
  const { data: updated } = await supabase
    .from('sellers')
    .select('distribution_areas')
    .eq('seller_number', 'AA5852')
    .single();
  
  console.log('\n確認:');
  console.log('  更新後の配信エリア:', updated?.distribution_areas);
}

fixAA5852().catch(console.error);
