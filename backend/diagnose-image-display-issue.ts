import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseImageDisplayIssue() {
  console.log('画像表示問題の診断を開始します...\n');

  // 1. 公開物件の統計
  console.log('=== 1. 公開物件の統計 ===');
  const { count: totalPublic } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .eq('atbb_status', '専任・公開中');

  console.log(`公開物件総数: ${totalPublic}件`);

  const { count: withImageUrl } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .eq('atbb_status', '専任・公開中')
    .not('image_url', 'is', null);

  console.log(`image_url設定済み: ${withImageUrl}件`);
  console.log(`設定率: ${((withImageUrl! / totalPublic!) * 100).toFixed(1)}%`);

  // 2. 公開物件のサンプルデータ
  console.log('\n=== 2. 公開物件のサンプルデータ（5件） ===');
  const { data: publicProperties } = await supabase
    .from('property_listings')
    .select('property_number, image_url, storage_location, atbb_status')
    .eq('atbb_status', '専任・公開中')
    .limit(5);

  if (publicProperties) {
    for (const property of publicProperties) {
      console.log(`\n物件番号: ${property.property_number}`);
      console.log(`  ステータス: ${property.atbb_status}`);
      console.log(`  image_url: ${property.image_url ? '✅ 設定済み' : '❌ 未設定'}`);
      console.log(`  storage_location: ${property.storage_location ? '✅ 設定済み' : '❌ 未設定'}`);
      
      if (property.image_url) {
        console.log(`  画像URL: ${property.image_url.substring(0, 100)}...`);
      }
      if (property.storage_location) {
        console.log(`  ストレージ: ${property.storage_location.substring(0, 100)}...`);
      }
    }
  }

  // 3. image_urlが設定されているが公開されていない物件
  console.log('\n\n=== 3. image_urlが設定されているが公開されていない物件 ===');
  const { count: nonPublicWithImage } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null)
    .neq('atbb_status', '専任・公開中');

  console.log(`件数: ${nonPublicWithImage}件`);

  // 4. 公開物件でimage_urlが未設定の物件
  console.log('\n=== 4. 公開物件でimage_urlが未設定の物件（サンプル5件） ===');
  const { data: publicWithoutImage } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, atbb_status')
    .eq('atbb_status', '専任・公開中')
    .is('image_url', null)
    .limit(5);

  if (publicWithoutImage) {
    for (const property of publicWithoutImage) {
      console.log(`\n物件番号: ${property.property_number}`);
      console.log(`  storage_location: ${property.storage_location ? '✅ あり' : '❌ なし'}`);
      if (property.storage_location) {
        // パス形式かURL形式かを判定
        if (property.storage_location.startsWith('http')) {
          console.log(`  形式: URL形式 ✅`);
        } else {
          console.log(`  形式: パス形式 ⚠️  (要修正)`);
        }
        console.log(`  値: ${property.storage_location.substring(0, 100)}...`);
      }
    }
  }

  // 5. 問題の要約
  console.log('\n\n=== 5. 問題の要約 ===');
  
  const publicWithoutImageCount = totalPublic! - withImageUrl!;
  console.log(`\n公開物件のうち画像URLが未設定: ${publicWithoutImageCount}件`);
  
  if (publicWithoutImageCount > 0) {
    console.log('\n【推奨アクション】');
    console.log('1. `populate-property-image-urls.ts` を再実行して、残りの物件の画像URLを取得');
    console.log('2. パス形式の storage_location を持つ物件を修正');
    console.log('3. フロントエンドで image_url フィールドを使用するように修正');
  }

  // 6. フロントエンドの問題診断
  console.log('\n\n=== 6. フロントエンドの問題診断 ===');
  console.log('現在の実装:');
  console.log('  - バックエンド: getPublicProperties() で imageService.getFirstImage() を呼び出し');
  console.log('  - これは Google Drive API を毎回呼び出すため遅い');
  console.log('  - データベースの image_url フィールドは使用されていない');
  console.log('\n推奨される修正:');
  console.log('  - バックエンド: image_url フィールドを images 配列に変換');
  console.log('  - フロントエンド: 変更不要（既に images 配列を期待している）');
}

diagnoseImageDisplayIssue().catch(console.error);
