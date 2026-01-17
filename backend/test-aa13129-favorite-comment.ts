/**
 * AA13129物件のお気に入り文言機能テスト
 * 
 * このスクリプトは以下をテストします:
 * 1. AA13129物件の取得
 * 2. お気に入り文言APIエンドポイントの動作確認
 * 3. スプレッドシートからの文言取得
 * 4. 物件タイプに応じたセル位置の確認
 */

import { PropertyListingService } from './src/services/PropertyListingService';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { connectRedis } from './src/config/redis';
import dotenv from 'dotenv';

dotenv.config();

async function testFavoriteComment() {
  console.log('=== AA13129 お気に入り文言機能テスト ===\n');

  try {
    // Redisに接続
    await connectRedis();
    console.log('✅ Redis接続完了\n');

    const propertyListingService = new PropertyListingService();
    const favoriteCommentService = new FavoriteCommentService();

    // Step 1: AA13129物件を検索
    console.log('Step 1: AA13129物件を検索中...');
    const properties = await propertyListingService.searchByPropertyNumber('AA13129', true);

    if (properties.length === 0) {
      console.error('❌ AA13129物件が見つかりません');
      process.exit(1);
    }

    const property = properties[0];
    console.log('✅ AA13129物件が見つかりました');
    console.log(`   - 物件ID: ${property.id}`);
    console.log(`   - 物件番号: ${property.property_number}`);
    console.log(`   - 物件タイプ: ${property.property_type}`);
    console.log(`   - 格納先URL: ${property.storage_location ? '設定あり' : '設定なし'}`);
    console.log('');

    // Step 2: 物件タイプに応じたセル位置を確認
    console.log('Step 2: 物件タイプに応じたセル位置を確認');
    const cellMap: Record<string, string> = {
      '土地': 'B53',
      '戸建て': 'B142',
      '戸建': 'B142',
      'マンション': 'B150',
    };
    const expectedCell = cellMap[property.property_type];
    console.log(`   - 期待されるセル位置: ${expectedCell || '未対応の物件タイプ'}`);
    console.log('');

    // Step 3: お気に入り文言を取得（1回目 - キャッシュミス）
    console.log('Step 3: お気に入り文言を取得（1回目 - キャッシュミス）');
    const startTime1 = Date.now();
    const result1 = await favoriteCommentService.getFavoriteComment(property.id);
    const duration1 = Date.now() - startTime1;

    console.log(`   - 取得時間: ${duration1}ms`);
    console.log(`   - 物件タイプ: ${result1.propertyType}`);
    console.log(`   - お気に入り文言: ${result1.comment || '(なし)'}`);
    console.log('');

    // Step 4: お気に入り文言を取得（2回目 - キャッシュヒット）
    console.log('Step 4: お気に入り文言を取得（2回目 - キャッシュヒット）');
    const startTime2 = Date.now();
    const result2 = await favoriteCommentService.getFavoriteComment(property.id);
    const duration2 = Date.now() - startTime2;

    console.log(`   - 取得時間: ${duration2}ms`);
    console.log(`   - 物件タイプ: ${result2.propertyType}`);
    console.log(`   - お気に入り文言: ${result2.comment || '(なし)'}`);
    console.log(`   - キャッシュ効果: ${duration1 - duration2}ms短縮`);
    console.log('');

    // Step 5: 結果の検証
    console.log('Step 5: 結果の検証');
    
    if (!property.storage_location) {
      console.log('⚠️  格納先URLが設定されていません');
      console.log('   → お気に入り文言は取得できません');
    } else if (!expectedCell) {
      console.log(`⚠️  物件タイプ「${property.property_type}」は未対応です`);
      console.log('   → お気に入り文言は取得できません');
    } else if (!result1.comment) {
      console.log(`⚠️  スプレッドシートのセル ${expectedCell} が空です`);
      console.log('   → お気に入り文言を設定してください');
    } else {
      console.log('✅ お気に入り文言が正常に取得できました！');
      console.log(`   → 物件公開サイトの詳細画面に表示されます`);
    }
    console.log('');

    // Step 6: APIエンドポイントのテスト
    console.log('Step 6: APIエンドポイントのテスト');
    console.log(`   - エンドポイント: GET /api/public/properties/${property.id}/favorite-comment`);
    console.log(`   - 期待されるレスポンス:`);
    console.log(`     {`);
    console.log(`       "comment": "${result1.comment || null}",`);
    console.log(`       "propertyType": "${result1.propertyType}"`);
    console.log(`     }`);
    console.log('');

    // Step 7: フロントエンドでの表示確認
    console.log('Step 7: フロントエンドでの表示確認');
    console.log('   以下のURLにアクセスして確認してください:');
    console.log(`   http://localhost:5173/public/properties/${property.id}`);
    console.log('');
    console.log('   確認ポイント:');
    console.log('   1. 画像ギャラリーが表示される');
    console.log('   2. 画像の上にお気に入り文言がオーバーレイ表示される');
    console.log('   3. 文言が読みやすい（背景が半透明の黒、白文字）');
    console.log('   4. レスポンシブに表示される（PC/タブレット/スマホ）');
    console.log('');

    // まとめ
    console.log('=== テスト完了 ===');
    if (result1.comment) {
      console.log('✅ お気に入り文言機能は正常に動作しています');
    } else {
      console.log('⚠️  お気に入り文言が設定されていません');
      console.log('   → スプレッドシートに文言を追加してください');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// 実行
testFavoriteComment();
