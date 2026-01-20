import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 全物件の画像URLを取得してproperty_listingsテーブルに保存
 * これにより、リストビューで毎回Google Drive APIを呼ばずに済む
 */
async function backfillAllImageUrls() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const propertyImageService = new PropertyImageService(
    60, // cacheTTLMinutes
    60, // folderIdCacheTTLMinutes
    2,  // searchTimeoutSeconds
    3   // maxSubfoldersToSearch
  );

  console.log('🚀 全物件の画像URLをバックフィル開始...\n');

  try {
    // 全物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, atbb_status')
      .eq('atbb_status', '公開中')
      .order('property_number');

    if (error) {
      console.error('❌ 物件取得エラー:', error);
      process.exit(1);
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️  公開中の物件が見つかりません');
      return;
    }

    console.log(`📊 対象物件数: ${properties.length}件\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const progress = `[${i + 1}/${properties.length}]`;

      try {
        console.log(`${progress} ${property.property_number} - 画像URL取得中...`);

        if (!property.storage_location) {
          console.log(`   ⏭️  スキップ: storage_locationなし`);
          skipCount++;
          continue;
        }

        // 画像URLを取得
        const imageUrls = await propertyImageService.getPropertyImages(
          property.property_number,
          property.storage_location
        );

        if (!imageUrls || imageUrls.length === 0) {
          console.log(`   ⚠️  画像なし`);
          skipCount++;
          continue;
        }

        // データベースに保存（image_urlsカラムに保存）
        // 注意: このカラムはマイグレーション095で追加する必要があります
        const { error: updateError } = await supabase
          .from('property_listings')
          .update({
            // 既存のimage_urlカラムに最初の画像を保存
            image_url: imageUrls[0],
            // 将来的にimage_urlsカラムを追加したら、ここで全画像を保存
            // image_urls: imageUrls
          })
          .eq('id', property.id);

        if (updateError) {
          console.log(`   ❌ 更新エラー:`, updateError.message);
          errorCount++;
        } else {
          console.log(`   ✅ 成功: ${imageUrls.length}枚の画像URL`);
          successCount++;
        }

        // レート制限対策: 少し待機
        if (i % 10 === 0 && i > 0) {
          console.log(`\n⏸️  10件処理完了、1秒待機...\n`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: any) {
        console.log(`   ❌ エラー:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 バックフィル完了:');
    console.log(`   ✅ 成功: ${successCount}件`);
    console.log(`   ⏭️  スキップ: ${skipCount}件`);
    console.log(`   ❌ エラー: ${errorCount}件`);
    console.log(`   📈 成功率: ${((successCount / properties.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ 致命的エラー:', error);
    process.exit(1);
  }
}

backfillAllImageUrls();
