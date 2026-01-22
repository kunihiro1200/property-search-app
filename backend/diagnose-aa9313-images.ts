import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const propertyImageService = new PropertyImageService();

async function diagnoseAA9313Images() {
  console.log('=== AA9313 画像表示問題の診断 ===\n');

  try {
    // AA9313のデータを取得
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA9313')
      .single();

    if (error) {
      console.error('❌ 物件データの取得に失敗:', error);
      return;
    }

    if (!property) {
      console.log('❌ AA9313が見つかりません');
      return;
    }

    console.log('📋 物件情報:');
    console.log(`  物件番号: ${property.property_number}`);
    console.log(`  物件ID: ${property.id}`);
    console.log(`  格納先URL: ${property.storage_location || '未設定'}`);
    console.log(`  画像URL: ${property.image_url || '未設定'}`);
    console.log(`  非表示画像: ${property.hidden_images || '[]'}`);
    console.log(`  公開表示: ${property.site_display || '未設定'}`);
    console.log('');

    // storage_locationの確認
    if (!property.storage_location) {
      console.log('⚠️  格納先URLが設定されていません');
      console.log('   → 物件リストテーブルで格納先URLを設定してください');
      return;
    }

    // フォルダIDの抽出
    const folderId = propertyImageService.extractFolderIdFromUrl(property.storage_location);
    console.log('🔍 フォルダID抽出:');
    console.log(`  抽出結果: ${folderId || '抽出失敗'}`);
    console.log('');

    if (!folderId) {
      console.log('❌ 格納先URLからフォルダIDを抽出できません');
      console.log(`   現在の値: ${property.storage_location}`);
      console.log('   正しい形式: https://drive.google.com/drive/folders/FOLDER_ID');
      return;
    }

    // Google Driveから画像を取得
    console.log('📸 Google Driveから画像を取得中...');
    try {
      const result = await propertyImageService.getImagesFromStorageUrl(property.storage_location);
      
      console.log(`  フォルダID: ${result.folderId}`);
      console.log(`  画像数: ${result.images.length}件`);
      console.log(`  キャッシュ: ${result.cached ? 'あり' : 'なし'}`);
      console.log('');

      if (result.images.length === 0) {
        console.log('⚠️  Google Driveフォルダに画像が見つかりません');
        console.log('   考えられる原因:');
        console.log('   1. フォルダが空');
        console.log('   2. 画像ファイルが存在しない');
        console.log('   3. "athome公開"または"atbb公開"サブフォルダが空');
        console.log('   4. アクセス権限の問題');
        console.log('');
        console.log('   確認方法:');
        console.log(`   1. ブラウザで開く: ${property.storage_location}`);
        console.log('   2. フォルダ内に画像ファイルがあるか確認');
        console.log('   3. "athome公開"または"atbb公開"サブフォルダがあるか確認');
        return;
      }

      console.log('✅ 画像が見つかりました:');
      result.images.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.name}`);
        console.log(`     ID: ${img.id}`);
        console.log(`     サイズ: ${(img.size / 1024).toFixed(2)} KB`);
        console.log(`     サムネイルURL: ${img.thumbnailUrl}`);
        console.log('');
      });

      // image_urlの確認
      if (!property.image_url) {
        console.log('⚠️  データベースにimage_urlが設定されていません');
        console.log('   → 画像URLを設定する必要があります');
        console.log('');
        console.log('📝 修正方法:');
        console.log('   以下のコマンドを実行してください:');
        console.log('');
        console.log('   npx tsx backend/fix-aa9313-image-url.ts');
        console.log('');
      } else {
        console.log('✅ データベースにimage_urlが設定されています');
        console.log(`   現在の値: ${property.image_url}`);
        console.log('');
        
        // image_urlが正しいか確認
        const expectedUrl = `/api/public/images/${result.images[0].id}/thumbnail`;
        if (property.image_url !== expectedUrl) {
          console.log('⚠️  image_urlが最新の画像と一致しません');
          console.log(`   期待値: ${expectedUrl}`);
          console.log(`   現在値: ${property.image_url}`);
          console.log('');
          console.log('📝 修正方法:');
          console.log('   以下のコマンドを実行してください:');
          console.log('');
          console.log('   npx tsx backend/fix-aa9313-image-url.ts');
          console.log('');
        } else {
          console.log('✅ image_urlは正しく設定されています');
        }
      }

      // hidden_imagesの確認
      const hiddenImages = property.hidden_images ? JSON.parse(property.hidden_images) : [];
      if (hiddenImages.length > 0) {
        console.log('⚠️  非表示画像が設定されています:');
        hiddenImages.forEach((imgId: string, index: number) => {
          console.log(`  ${index + 1}. ${imgId}`);
        });
        console.log('');
        console.log('   → 最初の画像が非表示になっている可能性があります');
        console.log('');
      }

      // 診断結果サマリー
      console.log('=== 診断結果サマリー ===');
      console.log('');
      
      const issues: string[] = [];
      const solutions: string[] = [];

      if (!property.image_url) {
        issues.push('❌ image_urlが未設定');
        solutions.push('npx tsx backend/fix-aa9313-image-url.ts を実行');
      } else if (property.image_url !== `/api/public/images/${result.images[0].id}/thumbnail`) {
        issues.push('⚠️  image_urlが古い');
        solutions.push('npx tsx backend/fix-aa9313-image-url.ts を実行');
      }

      if (hiddenImages.length > 0 && hiddenImages.includes(result.images[0].id)) {
        issues.push('⚠️  最初の画像が非表示設定');
        solutions.push('hidden_imagesから該当画像IDを削除');
      }

      if (issues.length === 0) {
        console.log('✅ 問題は見つかりませんでした');
        console.log('');
        console.log('   画像が表示されない場合は、以下を確認してください:');
        console.log('   1. ブラウザのキャッシュをクリア');
        console.log('   2. バックエンドサーバーを再起動');
        console.log('   3. フロントエンドを再読み込み');
      } else {
        console.log('問題点:');
        issues.forEach(issue => console.log(`  ${issue}`));
        console.log('');
        console.log('解決策:');
        solutions.forEach(solution => console.log(`  ${solution}`));
      }

    } catch (imageError: any) {
      console.error('❌ 画像取得中にエラーが発生:', imageError.message);
      console.error('   詳細:', imageError);
      console.log('');
      console.log('   考えられる原因:');
      console.log('   1. Google Drive APIの認証エラー');
      console.log('   2. フォルダへのアクセス権限がない');
      console.log('   3. フォルダIDが無効');
      console.log('   4. ネットワークエラー');
    }

  } catch (error: any) {
    console.error('❌ 診断中にエラーが発生:', error.message);
    console.error('   詳細:', error);
  }
}

// スクリプト実行
diagnoseAA9313Images()
  .then(() => {
    console.log('\n診断が完了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n診断がエラーで終了しました:', error);
    process.exit(1);
  });
