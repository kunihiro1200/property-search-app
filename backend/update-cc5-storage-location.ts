// CC5のstorage_locationを更新
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function updateCC5StorageLocation() {
  console.log('=== CC5のstorage_location更新 ===\n');

  const propertyNumber = 'CC5';
  const storageUrl = 'https://drive.google.com/drive/folders/1VLD4BPEm1QyDWYZtZwngM3-OFVu5YhFk';

  // Supabaseクライアント初期化
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1. 現在の状態を確認
    console.log('1. 現在の状態を確認...');
    const { data: currentProperty, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, image_url')
      .eq('property_number', propertyNumber)
      .single();

    if (fetchError) {
      throw new Error(`物件の取得に失敗: ${fetchError.message}`);
    }

    console.log('物件ID:', currentProperty.id);
    console.log('物件番号:', currentProperty.property_number);
    console.log('現在のstorage_location:', currentProperty.storage_location || '(空)');
    console.log('現在のimage_url:', currentProperty.image_url || '(空)');
    console.log('');

    // 2. storage_locationを更新
    console.log('2. storage_locationを更新...');
    console.log('新しいstorage_location:', storageUrl);
    
    const { data: updatedProperty, error: updateError } = await supabase
      .from('property_listings')
      .update({
        storage_location: storageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', propertyNumber)
      .select()
      .single();

    if (updateError) {
      throw new Error(`更新に失敗: ${updateError.message}`);
    }

    console.log('✅ 更新成功！');
    console.log('');

    // 3. 更新後の確認
    console.log('3. 更新後の確認...');
    console.log('物件番号:', updatedProperty.property_number);
    console.log('storage_location:', updatedProperty.storage_location);
    console.log('');

    console.log('=== 更新完了 ===');
    console.log('✅ CC5のstorage_locationが正常に更新されました');
    console.log('');
    console.log('次のステップ:');
    console.log('1. バックエンドを再起動してください');
    console.log('2. 公開物件サイトでCC5を確認してください');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    throw error;
  }
}

updateCC5StorageLocation()
  .then(() => {
    console.log('\n処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n処理中にエラーが発生しました:', error);
    process.exit(1);
  });
