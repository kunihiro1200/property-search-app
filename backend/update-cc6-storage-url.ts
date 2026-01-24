import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function updateCC6StorageUrl() {
  console.log('=== CC6の格納先URLを更新 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const newStorageUrl = 'https://drive.google.com/drive/folders/16p4voX2h3oqxWRnsaczu_ax85s_Je_NK';

  console.log('新しい格納先URL:', newStorageUrl);
  console.log('');

  // 現在の値を確認
  const { data: before, error: beforeError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', 'CC6')
    .single();

  if (beforeError) {
    console.error('❌ Error fetching current data:', beforeError);
    return;
  }

  console.log('更新前:');
  console.log('  - property_number:', before.property_number);
  console.log('  - storage_location:', before.storage_location);
  console.log('');

  // 更新
  const { data: after, error: updateError } = await supabase
    .from('property_listings')
    .update({ storage_location: newStorageUrl })
    .eq('property_number', 'CC6')
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating:', updateError);
    return;
  }

  console.log('✅ 更新成功！');
  console.log('');
  console.log('更新後:');
  console.log('  - property_number:', after.property_number);
  console.log('  - storage_location:', after.storage_location);
  console.log('');
  console.log('📝 次のステップ:');
  console.log('1. バックエンドサーバーを再起動（キャッシュをクリア）');
  console.log('2. ブラウザで http://localhost:5173/public/properties/CC6 を開く');
  console.log('3. 「画像を更新」ボタンをクリック');
  console.log('4. ページをリロード');
}

updateCC6StorageUrl().catch(console.error);
