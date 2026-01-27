import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://krxhrbtlgfjzsseegaqq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeGhyYnRsZ2ZqenNzZWVnYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAyMTQxMSwiZXhwIjoyMDc4NTk3NDExfQ.nog3UX9J9OgfqlCIPJt_sU_exE6Ny-nSj_HmwgV3oA8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC6() {
  console.log('=== CC6の現在の状態 ===\n');

  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url, updated_at')
    .eq('property_number', 'CC6')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!data) {
    console.log('CC6が見つかりません');
    return;
  }

  console.log('物件番号:', data.property_number);
  console.log('\n格納先URL:');
  console.log(data.storage_location || '(未設定)');
  console.log('\n画像URL:');
  console.log(data.image_url || '(未設定)');
  console.log('\n最終更新日時:', data.updated_at);
  
  // 格納先URLの形式を確認
  if (data.storage_location) {
    console.log('\n格納先URLの形式:');
    if (data.storage_location.includes('drive.google.com/drive/folders/')) {
      console.log('✅ Google DriveのフォルダURL形式');
      
      // フォルダIDを抽出
      const match = data.storage_location.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match) {
        console.log('フォルダID:', match[1]);
      }
    } else {
      console.log('⚠️ Google DriveのURL形式ではありません');
    }
  }
}

checkCC6().catch(console.error);
