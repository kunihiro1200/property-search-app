import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { PropertyListingService } from './src/services/PropertyListingService';

/**
 * お気に入り文言とおすすめコメントの診断スクリプト
 * 
 * 特定の物件IDに対して、両方のサービスが正しく動作しているかを確認します
 */
async function diagnose() {
  try {
    console.log('=== お気に入り文言・おすすめコメント診断 ===\n');

    // 診断対象の物件ID（AA13129など、実際の物件IDに置き換えてください）
    const testPropertyId = process.argv[2];

    if (!testPropertyId) {
      console.error('使用方法: ts-node diagnose-favorite-recommended-comments.ts <物件ID>');
      console.error('例: ts-node diagnose-favorite-recommended-comments.ts <UUID>');
      process.exit(1);
    }

    console.log(`診断対象物件ID: ${testPropertyId}\n`);

    // 1. 物件情報を取得
    console.log('1. 物件情報を取得中...');
    const propertyService = new PropertyListingService();
    const property = await propertyService.getPublicPropertyById(testPropertyId);

    if (!property) {
      console.error('❌ 物件が見つかりません');
      process.exit(1);
    }

    console.log('✅ 物件情報:');
    console.log(`   - 物件番号: ${property.property_number}`);
    console.log(`   - 物件タイプ: ${property.property_type}`);
    console.log(`   - 住所: ${property.address}`);
    console.log(`   - storage_location: ${property.storage_location || '(なし)'}`);
    console.log('');

    // 2. お気に入り文言を取得
    console.log('2. お気に入り文言を取得中...');
    const favoriteService = new FavoriteCommentService();
    const favoriteResult = await favoriteService.getFavoriteComment(testPropertyId);

    console.log('✅ お気に入り文言の結果:');
    console.log(`   - 物件タイプ: ${favoriteResult.propertyType}`);
    console.log(`   - コメント: ${favoriteResult.comment || '(なし)'}`);
    console.log('');

    // 3. おすすめコメントを取得
    console.log('3. おすすめコメントを取得中...');
    const recommendedService = new RecommendedCommentService();
    const recommendedResult = await recommendedService.getRecommendedComment(
      property.property_number,
      property.property_type,
      testPropertyId
    );

    console.log('✅ おすすめコメントの結果:');
    console.log(`   - 物件タイプ: ${recommendedResult.propertyType}`);
    console.log(`   - コメント: ${recommendedResult.comment || '(なし)'}`);
    console.log('');

    // 4. 診断結果のサマリー
    console.log('=== 診断結果サマリー ===');
    
    if (favoriteResult.comment) {
      console.log('✅ お気に入り文言: 正常に取得できました');
    } else {
      console.log('⚠️  お気に入り文言: 取得できませんでした');
      console.log('   考えられる原因:');
      console.log('   - storage_locationが設定されていない');
      console.log('   - スプレッドシートにathomeシートがない');
      console.log('   - セル位置が間違っている');
    }

    if (recommendedResult.comment) {
      console.log('✅ おすすめコメント: 正常に取得できました');
    } else {
      console.log('⚠️  おすすめコメント: 取得できませんでした');
      console.log('   考えられる原因:');
      console.log('   - 物件番号のシートが存在しない');
      console.log('   - セル位置が間違っている');
      console.log('   - 物件タイプのマッピングが間違っている');
    }

    console.log('\n診断完了');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

diagnose();
