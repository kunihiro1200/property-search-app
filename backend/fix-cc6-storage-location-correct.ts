import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://krxhrbtlgfjzsseegaqq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeGhyYnRsZ2ZqenNzZWVnYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAyMTQxMSwiZXhwIjoyMDc4NTk3NDExfQ.nog3UX9J9OgfqlCIPJt_sU_exE6Ny-nSj_HmwgV3oA8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCC6StorageLocation() {
  console.log('=== CC6のstorage_locationを正しいathome公開フォルダに修正 ===\n');

  // 正しいathome公開フォルダURL（セッション記録より）
  const correctAthomePublicUrl = 'https://drive.google.com/drive/folders/16p4voX2h3oqxWRnsaczu_ax85s_Je_NK';

  // 現在の状態を確認
  const { data: before, error: beforeError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', 'CC6')
    .single();

  if (beforeError) {
    console.error('エラー:', beforeError);
    return;
  }

  console.log('修正前:');
  console.log('  storage_location:', before?.storage_location);
  console.log('\n修正後（予定）:');
  console.log('  storage_location:', correctAthomePublicUrl);

  // 更新
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({
      storage_location: correctAthomePublicUrl,
      image_url: null, // 画像キャッシュをクリア
      updated_at: new Date().toISOString()
    })
    .eq('property_number', 'CC6');

  if (updateError) {
    console.error('\n❌ 更新エラー:', updateError);
    return;
  }

  // 更新後の確認
  const { data: after, error: afterError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', 'CC6')
    .single();

  if (afterError) {
    console.error('確認エラー:', afterError);
    return;
  }

  console.log('\n✅ 更新完了:');
  console.log('  storage_location:', after?.storage_location);
  
  if (after?.storage_location === correctAthomePublicUrl) {
    console.log('\n✅ CC6のstorage_locationが正しいathome公開フォルダに修正されました');
    console.log('   画像は26枚表示されるはずです');
  } else {
    console.log('\n⚠️ 更新が反映されていない可能性があります');
  }
}

fixCC6StorageLocation().catch(console.error);
