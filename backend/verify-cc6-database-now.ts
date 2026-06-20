import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://krxhrbtlgfjzsseegaqq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeGhyYnRsZ2ZqenNzZWVnYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAyMTQxMSwiZXhwIjoyMDc4NTk3NDExfQ.nog3UX9J9OgfqlCIPJt_sU_exE6Ny-nSj_HmwgV3oA8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyCC6Now() {
  console.log('=== CC6のデータベース状態を再確認 ===\n');

  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url, updated_at')
    .eq('property_number', 'CC6')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!data) {
    console.log('❌ CC6が見つかりません');
    return;
  }

  console.log('物件番号:', data.property_number);
  console.log('\n現在の格納先URL:');
  console.log(data.storage_location);
  console.log('');
  
  // URLを確認
  if (data.storage_location.includes('16p4voX2h3oqxWRnsaczu_ax85s_Je_NK')) {
    console.log('✅ 正しいathome公開フォルダのURLです（26枚）');
  } else if (data.storage_location.includes('1r3L1toOTgFPXBCutMuT8r1rdaVocwPAX')) {
    console.log('❌ 間違ったふじが丘西1丁目フォルダのURLです（39枚）');
    console.log('   → データベースの更新が反映されていません！');
  } else if (data.storage_location.includes('1kXmrhesqayVV-i4zF8DznLK99tcCCauP')) {
    console.log('⚠️ 親フォルダのURLです');
    console.log('   → athome公開フォルダを検索する必要があります');
  } else {
    console.log('⚠️ 不明なURLです');
  }
  
  console.log('\n画像URL:');
  console.log(data.image_url || '(未設定)');
  console.log('\n最終更新日時:', data.updated_at);
  
  // 更新日時を確認
  const updatedAt = new Date(data.updated_at);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - updatedAt.getTime()) / 1000 / 60);
  
  console.log(`最終更新から ${diffMinutes} 分経過`);
  
  if (diffMinutes < 5) {
    console.log('✅ 最近更新されています');
  } else {
    console.log('⚠️ 更新から時間が経っています');
  }
}

verifyCC6Now().catch(console.error);
