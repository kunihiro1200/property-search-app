// 画像表示修正の最終確認
import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';

dotenv.config();

async function verifyImageFixComplete() {
  console.log('=== 画像表示修正の最終確認 ===\n');

  const service = new PropertyListingService();

  try {
    // 公開物件を取得
    const result = await service.getPublicProperties({ limit: 10 });

    console.log(`総件数: ${result.total}件`);
    console.log(`取得件数: ${result.properties.length}件\n`);

    // 統計情報
    let withImages = 0;
    let withoutImages = 0;
    let missingImagesArray = 0;

    result.properties.forEach((property) => {
      if (!property.images) {
        missingImagesArray++;
      } else if (property.images.length > 0) {
        withImages++;
      } else {
        withoutImages++;
      }
    });

    console.log('=== 統計 ===');
    console.log(`✅ 画像あり: ${withImages}件`);
    console.log(`⚪ 画像なし（空配列）: ${withoutImages}件`);
    console.log(`❌ images配列なし: ${missingImagesArray}件\n`);

    // 検証
    if (missingImagesArray > 0) {
      console.log('❌ 失敗: images配列が存在しない物件があります');
      process.exit(1);
    }

    // 画像URLの形式を確認
    let validUrls = 0;
    let invalidUrls = 0;

    result.properties.forEach((property) => {
      if (property.images && property.images.length > 0) {
        property.images.forEach((url: string) => {
          if (url.startsWith('https://drive.google.com/')) {
            validUrls++;
          } else {
            invalidUrls++;
            console.log(`⚠️ 無効なURL: ${url} (物件: ${property.property_number})`);
          }
        });
      }
    });

    console.log('=== URL検証 ===');
    console.log(`✅ 有効なURL: ${validUrls}件`);
    console.log(`❌ 無効なURL: ${invalidUrls}件\n`);

    if (invalidUrls > 0) {
      console.log('❌ 失敗: 無効な画像URLがあります');
      process.exit(1);
    }

    // 成功
    console.log('=== 最終結果 ===');
    console.log('✅ 全ての検証に合格しました！');
    console.log('✅ 画像表示修正は正常に動作しています');
    console.log('\n次のステップ:');
    console.log('1. フロントエンドで動作確認');
    console.log('2. 本番環境へのデプロイ');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyImageFixComplete();
