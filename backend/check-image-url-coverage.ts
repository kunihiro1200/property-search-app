import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * property_listingsテーブルのimage_urlカラムのカバレッジを確認
 */
async function checkImageUrlCoverage() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('📊 image_urlカラムのカバレッジを確認中...\n');

  try {
    // 全物件数
    const { count: totalCount, error: totalError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ エラー:', totalError);
      process.exit(1);
    }

    // image_urlがある物件数
    const { count: withImageUrlCount, error: withImageUrlError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .not('image_url', 'is', null);

    if (withImageUrlError) {
      console.error('❌ エラー:', withImageUrlError);
      process.exit(1);
    }

    // 公開中の物件数
    const { count: publicCount, error: publicError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .ilike('atbb_status', '%公開中%');

    if (publicError) {
      console.error('❌ エラー:', publicError);
      process.exit(1);
    }

    // 公開中でimage_urlがある物件数
    const { count: publicWithImageUrlCount, error: publicWithImageUrlError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .ilike('atbb_status', '%公開中%')
      .not('image_url', 'is', null);

    if (publicWithImageUrlError) {
      console.error('❌ エラー:', publicWithImageUrlError);
      process.exit(1);
    }

    console.log('📊 結果:');
    console.log(`   全物件数: ${totalCount}件`);
    console.log(`   image_urlあり: ${withImageUrlCount}件 (${((withImageUrlCount! / totalCount!) * 100).toFixed(1)}%)`);
    console.log(`   image_urlなし: ${totalCount! - withImageUrlCount!}件\n`);

    console.log(`   公開中物件数: ${publicCount}件`);
    console.log(`   公開中でimage_urlあり: ${publicWithImageUrlCount}件 (${((publicWithImageUrlCount! / publicCount!) * 100).toFixed(1)}%)`);
    console.log(`   公開中でimage_urlなし: ${publicCount! - publicWithImageUrlCount!}件\n`);

    // サンプルデータを表示
    const { data: sampleWithImage, error: sampleWithImageError } = await supabase
      .from('property_listings')
      .select('property_number, image_url, storage_location')
      .not('image_url', 'is', null)
      .limit(3);

    if (!sampleWithImageError && sampleWithImage) {
      console.log('📷 image_urlありのサンプル:');
      sampleWithImage.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.property_number}`);
        console.log(`      image_url: ${row.image_url?.substring(0, 80)}...`);
      });
    }

    const { data: sampleWithoutImage, error: sampleWithoutImageError } = await supabase
      .from('property_listings')
      .select('property_number, image_url, storage_location')
      .is('image_url', null)
      .limit(3);

    if (!sampleWithoutImageError && sampleWithoutImage) {
      console.log('\n📷 image_urlなしのサンプル:');
      sampleWithoutImage.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.property_number}`);
        console.log(`      storage_location: ${row.storage_location || 'なし'}`);
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

checkImageUrlCoverage();
