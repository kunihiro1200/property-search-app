import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const propertyImageService = new PropertyImageService();

async function fixAA9313ImageUrl() {
  console.log('=== AA9313 画像URL修正スクリプト ===\n');

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

    console.log('📋 現在の状態:');
    console.log(`  物件番号: ${property.property_number}`);
    console.log(`  格納先URL: ${property.storage_location || '未設定'}`);
    console.log(`  現在のimage_url: ${property.image_url || '未設定'}`);
    console.log('');

    if (!property.storage_location) {
      console.log('❌ 格納先URLが設定されていません');
      return;
    }

    // Google Driveから画像を取得
    console.log('📸 Google Driveから画像を取得中...');
    const imageUrls = await propertyImageService.getFirstImage(property.id, property.storage_location);

    if (imageUrls.length === 0) {
      console.log('❌ Google Driveフォルダに画像が見つかりません');
      console.log('   フォルダを確認してください:');
      console.log(`   ${property.storage_location}`);
      return;
    }

    const newImageUrl = imageUrls[0];
    console.log(`✅ 画像が見つかりました: ${newImageUrl}`);
    console.log('');

    // データベースを更新
    console.log('💾 データベースを更新中...');
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({ image_url: newImageUrl })
      .eq('id', property.id);

    if (updateError) {
      console.error('❌ 更新に失敗:', updateError);
      return;
    }

    console.log('✅ 更新完了!');
    console.log('');
    console.log('📝 更新内容:');
    console.log(`  変更前: ${property.image_url || '未設定'}`);
    console.log(`  変更後: ${newImageUrl}`);
    console.log('');
    console.log('🎉 AA9313の画像URLを修正しました!');
    console.log('');
    console.log('次のステップ:');
    console.log('  1. ブラウザで公開物件サイトを開く');
    console.log('  2. AA9313を検索');
    console.log('  3. 画像が表示されることを確認');
    console.log('');
    console.log('  画像が表示されない場合:');
    console.log('  - ブラウザのキャッシュをクリア');
    console.log('  - バックエンドサーバーを再起動');

  } catch (error: any) {
    console.error('❌ 修正中にエラーが発生:', error.message);
    console.error('   詳細:', error);
  }
}

// スクリプト実行
fixAA9313ImageUrl()
  .then(() => {
    console.log('\nスクリプトが完了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nスクリプトがエラーで終了しました:', error);
    process.exit(1);
  });
