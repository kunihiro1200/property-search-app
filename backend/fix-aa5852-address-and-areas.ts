// AA5852の住所と配信エリアを修正
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from './src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixAA5852() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== AA5852の住所と配信エリア修正 ===\n');

  // 正しい物件所在地
  const correctAddress = '大分市大字常行常行180-4';
  const encryptedAddress = encrypt(correctAddress);
  
  // 常行は大分市なので、④と㊵を設定
  const correctAreas = ['④', '㊵'];
  
  console.log('修正内容:');
  console.log('  物件所在地:', correctAddress);
  console.log('  配信エリア:', correctAreas);
  
  // 更新実行
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      address: encryptedAddress,
      distribution_areas: correctAreas
    })
    .eq('seller_number', 'AA5852');

  if (updateError) {
    console.error('\n更新エラー:', updateError.message);
    return;
  }

  console.log('\n✓ 住所と配信エリアを修正しました');
  
  // 確認
  const { data: updated, error: fetchError } = await supabase
    .from('sellers')
    .select('seller_number, address, distribution_areas')
    .eq('seller_number', 'AA5852')
    .single();
  
  if (fetchError) {
    console.error('確認エラー:', fetchError.message);
    return;
  }

  console.log('\n確認:');
  console.log('  売主番号:', updated?.seller_number);
  console.log('  住所（暗号化）:', updated?.address?.substring(0, 50) + '...');
  console.log('  配信エリア:', updated?.distribution_areas);
}

fixAA5852().catch(console.error);
