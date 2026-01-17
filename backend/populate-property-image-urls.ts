import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const propertyImageService = new PropertyImageService();

async function populatePropertyImageUrls() {
  console.log('画像URL一括取得スクリプトを開始します...\n');

  try {
    // storage_locationが存在し、image_urlが空の物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, image_url')
      .not('storage_location', 'is', null)
      .neq('storage_location', '');

    if (error) {
      console.error('物件データの取得に失敗しました:', error);
      return;
    }

    console.log(`対象物件数: ${properties?.length || 0}件\n`);

    if (!properties || properties.length === 0) {
      console.log('処理対象の物件がありません。');
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const property of properties) {
      try {
        // 既にimage_urlが設定されている場合はスキップ
        if (property.image_url) {
          console.log(`[スキップ] ${property.property_number}: 既に画像URLが設定されています`);
          skipCount++;
          continue;
        }

        console.log(`[処理中] ${property.property_number}: ${property.storage_location}`);

        // Google Driveから画像URLを取得
        const imageUrls = await propertyImageService.getFirstImage(property.id, property.storage_location);

        if (imageUrls.length > 0) {
          const imageUrl = imageUrls[0];
          
          // データベースに保存
          const { error: updateError } = await supabase
            .from('property_listings')
            .update({ image_url: imageUrl })
            .eq('id', property.id);

          if (updateError) {
            console.error(`  ❌ 更新失敗: ${updateError.message}`);
            errorCount++;
          } else {
            console.log(`  ✅ 成功: 画像URLを保存しました`);
            successCount++;
          }
        } else {
          console.log(`  ⚠️  画像が見つかりませんでした`);
          errorCount++;
        }

        // API制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`  ❌ エラー: ${err instanceof Error ? err.message : String(err)}`);
        errorCount++;
      }
    }

    console.log('\n=== 処理完了 ===');
    console.log(`成功: ${successCount}件`);
    console.log(`スキップ: ${skipCount}件`);
    console.log(`エラー: ${errorCount}件`);
    console.log(`合計: ${properties.length}件`);

  } catch (error) {
    console.error('スクリプト実行中にエラーが発生しました:', error);
  }
}

// スクリプト実行
populatePropertyImageUrls()
  .then(() => {
    console.log('\nスクリプトが正常に終了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nスクリプトがエラーで終了しました:', error);
    process.exit(1);
  });
