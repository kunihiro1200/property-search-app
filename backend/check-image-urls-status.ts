import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkImageUrlsStatus() {
  console.log('画像URL設定状況を確認中...\n');

  // 画像URLが設定されている物件のサンプル
  const { data: withImages, error } = await supabase
    .from('property_listings')
    .select('property_number, image_url, storage_location')
    .not('image_url', 'is', null)
    .limit(5);

  if (error) {
    console.error('データ取得エラー:', error);
    return;
  }

  console.log('=== 画像URLが設定されている物件（サンプル5件） ===');
  if (withImages) {
    withImages.forEach(p => {
      console.log(`\n物件番号: ${p.property_number}`);
      console.log(`画像URL: ${p.image_url?.substring(0, 80)}...`);
      console.log(`ストレージ: ${p.storage_location?.substring(0, 80)}...`);
    });
  }

  // 画像URLが設定されている物件の総数
  const { count: withImageCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null);

  console.log(`\n\n=== 統計 ===`);
  console.log(`画像URLが設定されている物件: ${withImageCount}件`);

  // 全物件数
  const { count: totalCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });

  console.log(`全物件数: ${totalCount}件`);
  console.log(`設定率: ${((withImageCount! / totalCount!) * 100).toFixed(1)}%`);

  // storage_locationがあるのにimage_urlがない物件
  const { count: needsImageCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('storage_location', 'is', null)
    .neq('storage_location', '')
    .is('image_url', null);

  console.log(`\nストレージはあるが画像URLがない物件: ${needsImageCount}件`);
}

checkImageUrlsStatus().catch(console.error);
