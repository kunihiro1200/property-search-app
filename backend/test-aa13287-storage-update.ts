import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAA12914StorageUpdate() {
  console.log('=== AA12914 格納先URL更新テスト ===\n');

  // 1. 現在の状態を確認
  console.log('1. 現在の状態を確認...');
  const { data: before, error: beforeError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url')
    .eq('property_number', 'AA12914')
    .single();

  if (beforeError) {
    console.error('エラー:', beforeError);
    return;
  }

  console.log('更新前:');
  console.log('  property_number:', before.property_number);
  console.log('  storage_location:', before.storage_location);
  console.log('  image_url:', before.image_url);
  console.log();

  // 2. 格納先URLを更新
  console.log('2. 格納先URLを更新...');
  const newStorageUrl = 'https://drive.google.com/drive/u/0/folders/1WCwCm1Y1jTu5XDyqucrdQEiSNU1s3v9G';
  
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({ storage_location: newStorageUrl })
    .eq('property_number', 'AA12914');

  if (updateError) {
    console.error('更新エラー:', updateError);
    return;
  }

  console.log('✅ 格納先URLを更新しました');
  console.log('  新しいURL:', newStorageUrl);
  console.log();

  // 3. 更新後の状態を確認
  console.log('3. 更新後の状態を確認...');
  const { data: after, error: afterError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url')
    .eq('property_number', 'AA12914')
    .single();

  if (afterError) {
    console.error('エラー:', afterError);
    return;
  }

  console.log('更新後:');
  console.log('  property_number:', after.property_number);
  console.log('  storage_location:', after.storage_location);
  console.log('  image_url:', after.image_url);
  console.log();

  console.log('=== テスト完了 ===');
  console.log('\n次のステップ:');
  console.log('1. ブラウザで http://localhost:5173 にアクセス');
  console.log('2. 公開物件一覧ページでAA12914の画像が表示されるか確認');
  console.log('3. 開発者ツールのネットワークタブで画像プロキシAPIへのリクエストを確認');
}

testAA12914StorageUpdate().catch(console.error);
