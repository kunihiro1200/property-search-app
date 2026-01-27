import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC6CurrentState() {
  console.log('=== CC6の現在の状態を確認 ===\n');

  // property_listingsテーブルからCC6を取得
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url, updated_at')
    .eq('property_number', 'CC6')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!property) {
    console.log('CC6が見つかりません');
    return;
  }

  console.log('物件番号:', property.property_number);
  console.log('格納先URL:', property.storage_location);
  console.log('画像URL:', property.image_url);
  console.log('最終更新日時:', property.updated_at);
  console.log('\n');

  // 格納先URLの形式を確認
  if (property.storage_location) {
    if (property.storage_location.includes('drive.google.com')) {
      console.log('✅ 格納先URLはGoogle DriveのURL形式です');
      if (property.storage_location.includes('athome公開')) {
        console.log('✅ athome公開フォルダを指しています');
      } else {
        console.log('⚠️ athome公開フォルダを指していない可能性があります');
      }
    } else {
      console.log('⚠️ 格納先URLがGoogle DriveのURL形式ではありません');
      console.log('   フォルダパス形式の可能性があります');
    }
  } else {
    console.log('❌ 格納先URLが設定されていません');
  }

  console.log('\n');

  // 画像URLの形式を確認
  if (property.image_url) {
    if (property.image_url.includes('drive.google.com')) {
      console.log('✅ 画像URLはGoogle DriveのURL形式です');
    } else {
      console.log('⚠️ 画像URLがGoogle DriveのURL形式ではありません');
    }
  } else {
    console.log('❌ 画像URLが設定されていません');
  }
}

checkCC6CurrentState().catch(console.error);
