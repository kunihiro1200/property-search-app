/**
 * CC6のstorage_locationを元の親フォルダURLに戻すスクリプト
 * テスト用: 再帰的検索が機能するか確認
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== CC6 storage_location 復元スクリプト ===\n');
  
  const propertyNumber = 'CC6';
  const originalUrl = 'https://drive.google.com/drive/folders/1r3L1toOTgFPXBCutMuT8r1rdaVocwPAX';
  
  console.log('物件番号:', propertyNumber);
  console.log('復元するURL:', originalUrl);
  console.log('（親フォルダのURL - 再帰的検索でathome公開を見つける必要がある）\n');
  
  // 現在のstorage_locationを確認
  const { data: currentData, error: fetchError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', propertyNumber)
    .single();
  
  if (fetchError) {
    console.error('❌ エラー:', fetchError.message);
    return;
  }
  
  console.log('現在のstorage_location:', currentData.storage_location);
  
  // 更新
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({ storage_location: originalUrl })
    .eq('property_number', propertyNumber);
  
  if (updateError) {
    console.error('❌ 更新エラー:', updateError.message);
    return;
  }
  
  console.log('\n✅ storage_locationを復元しました');
  console.log('\n次のステップ:');
  console.log('1. バックエンドサーバーを再起動');
  console.log('2. ブラウザでCC6の詳細ページを開く');
  console.log('3. 「画像を更新」ボタンをクリック');
  console.log('4. 画像が表示されるか確認（再帰的検索が機能しているか）');
}

main().catch(console.error);
