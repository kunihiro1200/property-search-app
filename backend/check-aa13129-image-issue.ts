import { createClient } from '@supabase/supabase-js';
import { GoogleDriveService } from './src/services/GoogleDriveService';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAA13129() {
  console.log('=== AA13129 画像表示問題の調査 ===\n');

  // 1. property_listingsテーブルのデータを確認
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, google_map_url, image_url')
    .eq('property_number', 'AA13129')
    .single();

  if (listingError) {
    console.log('❌ property_listingsからのデータ取得エラー:', listingError);
    return;
  }

  console.log('📋 property_listingsのデータ:');
  console.log('  物件番号:', listing.property_number);
  console.log('  storage_location:', listing.storage_location || '未設定');
  console.log('  google_map_url:', listing.google_map_url || '未設定');
  console.log('  image_url:', listing.image_url || '未設定');
  console.log('');

  if (!listing.storage_location) {
    console.log('❌ storage_locationが未設定です');
    console.log('⚠️ これが画像が表示されない原因です');
    return;
  }

  // 2. storage_locationからフォルダIDを抽出
  const folderIdMatch = listing.storage_location.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (!folderIdMatch) {
    console.log('❌ storage_locationからフォルダIDを抽出できません');
    console.log('  storage_location:', listing.storage_location);
    return;
  }
  
  const folderId = folderIdMatch[1];
  console.log('  フォルダID:', folderId);
  console.log('');

  // 3. Google Driveから画像を取得
  console.log('📁 Google Driveから画像を取得中...');
  const driveService = new GoogleDriveService();
  
  try {
    const images = await driveService.listImagesWithThumbnails(folderId);
    console.log(`✅ 画像取得成功: ${images.length}枚`);
    
    if (images.length === 0) {
      console.log('⚠️ フォルダに画像がありません');
      console.log('⚠️ これが画像が表示されない原因です');
    } else {
      console.log('\n画像一覧:');
      images.forEach((img, idx) => {
        console.log(`  ${idx + 1}. ${img.name} (${img.id})`);
      });
    }
  } catch (error: any) {
    console.log('❌ 画像取得エラー:', error.message);
    if (error.code) {
      console.log('  エラーコード:', error.code);
    }
  }

  console.log('\n=== 調査完了 ===');
}

checkAA13129().catch(console.error);
