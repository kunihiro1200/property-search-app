import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncAA8695StorageLocation() {
  console.log('🔧 AA8695物件のstorage_locationを設定中...\n');
  
  const folderUrl = 'https://drive.google.com/drive/folders/1TzXe4NdPJn8r3loSakvjGmhmFbuJW_S9';
  
  // property_listingsテーブルを更新
  const { data, error } = await supabase
    .from('property_listings')
    .update({
      storage_location: folderUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('property_number', 'AA8695')
    .select();
  
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('✅ AA8695物件のstorage_locationを設定しました！');
    console.log(`  物件番号: ${data[0].property_number}`);
    console.log(`  格納先: ${data[0].storage_location}`);
    console.log('');
    console.log('📋 画像取得の流れ:');
    console.log('  1. 親フォルダ: AA8695/');
    console.log('  2. システムが自動的に「athome公開」サブフォルダを検索');
    console.log('  3. 「athome公開」フォルダ内の10枚の画像を取得');
    console.log('');
    console.log('✅ 公開物件サイトで画像が表示されるようになりました！');
  } else {
    console.log('❌ AA8695物件が見つかりませんでした');
  }
}

syncAA8695StorageLocation().catch(console.error);
