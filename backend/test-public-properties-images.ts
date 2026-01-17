// 公開物件一覧APIのimages配列テスト
import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';

// 環境変数を読み込む
dotenv.config();

async function testPublicPropertiesImages() {
  console.log('=== 公開物件一覧APIのimages配列テスト ===\n');

  const service = new PropertyListingService();

  try {
    // 1. 公開物件を取得（最大5件）
    console.log('1. 公開物件を取得中...');
    const result = await service.getPublicProperties({ limit: 5 });

    console.log(`\n取得件数: ${result.properties.length}件`);
    console.log(`総件数: ${result.total}件\n`);

    // 2. 各物件のimages配列を確認
    result.properties.forEach((property, index) => {
      console.log(`--- 物件 ${index + 1} ---`);
      console.log(`物件番号: ${property.property_number}`);
      console.log(`住所: ${property.address}`);
      console.log(`images配列: ${property.images ? 'あり' : 'なし'}`);
      
      if (property.images) {
        console.log(`画像数: ${property.images.length}枚`);
        if (property.images.length > 0) {
          console.log(`最初の画像URL: ${property.images[0]}`);
          
          // URLの形式を確認
          const isValidUrl = property.images[0].startsWith('http://') || 
                            property.images[0].startsWith('https://');
          console.log(`URL形式: ${isValidUrl ? '正常' : '異常'}`);
        } else {
          console.log('画像なし（空配列）');
        }
      } else {
        console.log('⚠️ images配列が存在しません');
      }
      console.log('');
    });

    // 3. 結果サマリー
    console.log('=== テスト結果サマリー ===');
    const withImages = result.properties.filter(p => p.images && p.images.length > 0).length;
    const withoutImages = result.properties.filter(p => !p.images || p.images.length === 0).length;
    const missingImagesField = result.properties.filter(p => !p.images).length;

    console.log(`画像あり: ${withImages}件`);
    console.log(`画像なし: ${withoutImages}件`);
    console.log(`images配列なし: ${missingImagesField}件`);

    if (missingImagesField > 0) {
      console.log('\n❌ テスト失敗: images配列が存在しない物件があります');
      process.exit(1);
    } else {
      console.log('\n✅ テスト成功: 全ての物件にimages配列が含まれています');
    }

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPublicPropertiesImages();
