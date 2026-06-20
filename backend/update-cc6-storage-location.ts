import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://krxhrbtlgfjzsseegaqq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeGhyYnRsZ2ZqenNzZWVnYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAyMTQxMSwiZXhwIjoyMDc4NTk3NDExfQ.nog3UX9J9OgfqlCIPJt_sU_exE6Ny-nSj_HmwgV3oA8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateCC6StorageLocation() {
  console.log('=== CC6の格納先URLを更新 ===\n');

  const correctAthomeUrl = 'https://drive.google.com/drive/folders/16p4voX2h3oqxWRnsaczu_ax85s_Je_NK';
  
  console.log('新しい格納先URL:', correctAthomeUrl);
  console.log('（athome公開フォルダ、26枚の画像）\n');

  // 現在の状態を確認
  const { data: before, error: beforeError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url, updated_at')
    .eq('property_number', 'CC6')
    .single();

  if (beforeError) {
    console.error('❌ エラー:', beforeError);
    return;
  }

  console.log('【更新前】');
  console.log('格納先URL:', before.storage_location);
  console.log('画像URL:', before.image_url);
  console.log('最終更新:', before.updated_at);
  console.log('');

  // storage_locationとimage_urlをクリア（画像は次回取得時に自動更新される）
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({ 
      storage_location: correctAthomeUrl,
      image_url: null,  // 画像URLをクリアして、次回取得時に新しいフォルダから取得
      updated_at: new Date().toISOString()
    })
    .eq('property_number', 'CC6');

  if (updateError) {
    console.error('❌ 更新エラー:', updateError);
    return;
  }

  console.log('✅ 更新成功\n');

  // 更新後の状態を確認
  const { data: after, error: afterError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url, updated_at')
    .eq('property_number', 'CC6')
    .single();

  if (afterError) {
    console.error('❌ エラー:', afterError);
    return;
  }

  console.log('【更新後】');
  console.log('格納先URL:', after.storage_location);
  console.log('画像URL:', after.image_url);
  console.log('最終更新:', after.updated_at);
  console.log('');

  console.log('✅ CC6の格納先URLと画像URLを更新しました');
  console.log('');
  console.log('次のステップ:');
  console.log('1. 公開物件サイトでCC6を開く');
  console.log('2. 「画像・基本情報を更新」ボタンをクリック');
  console.log('3. 26枚の画像が表示されることを確認');
  console.log('4. 一覧ページでも新しい画像が表示されることを確認');
  console.log('5. しばらく待って（自動同期が実行されるまで）、画像が元に戻らないか確認');
}

updateCC6StorageLocation().catch(console.error);
