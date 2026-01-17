// CC5が公開物件APIで正しく表示されるかテスト
import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';

dotenv.config();

async function testCC5PublicAPI() {
  console.log('=== CC5公開物件API最終テスト ===\n');

  const propertyListingService = new PropertyListingService();

  try {
    // 1. 公開物件一覧でCC5を取得（最初の20件）
    console.log('1. 公開物件一覧でCC5を取得（最初の20件）...');
    const result = await propertyListingService.getPublicProperties({
      limit: 20,
      offset: 0
    });

    console.log(`取得件数: ${result.properties.length}件`);
    console.log(`総件数: ${result.pagination.total}件`);
    console.log('');

    // CC5を探す
    const cc5 = result.properties.find(p => p.property_number === 'CC5');

    if (!cc5) {
      console.log('❌ CC5が見つかりませんでした');
      console.log('');
      console.log('取得された物件番号:');
      result.properties.forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.property_number} - 画像: ${p.images?.length || 0}件`);
      });
      return;
    }

    console.log('✅ CC5が見つかりました！');
    console.log('');
    console.log('物件番号:', cc5.property_number);
    console.log('物件タイプ:', cc5.property_type);
    console.log('住所:', cc5.address);
    console.log('価格:', cc5.price);
    console.log('ATBB状態:', cc5.atbb_status);
    console.log('バッジタイプ:', cc5.badge_type);
    console.log('クリック可能:', cc5.is_clickable);
    console.log('画像数:', cc5.images?.length || 0);
    
    if (cc5.images && cc5.images.length > 0) {
      console.log('');
      console.log('✅ 画像が正常に取得されました！');
      console.log('最初の画像URL:', cc5.images[0]);
    } else {
      console.log('');
      console.log('❌ 画像が取得されませんでした');
    }

    console.log('');
    console.log('=== テスト完了 ===');
    
    if (cc5.images && cc5.images.length > 0) {
      console.log('✅ CC5は公開物件サイトで正常に表示されます！');
    } else {
      console.log('❌ CC5の画像が表示されません');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    throw error;
  }
}

testCC5PublicAPI()
  .then(() => {
    console.log('\n処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n処理中にエラーが発生しました:', error);
    process.exit(1);
  });
