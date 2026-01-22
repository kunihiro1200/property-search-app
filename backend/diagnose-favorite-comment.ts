import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { PropertyListingService } from './src/services/PropertyListingService';
import { WorkTaskService } from './src/services/WorkTaskService';
import { connectRedis, getRedisClient } from './src/config/redis';

/**
 * お気に入り文言の表示問題を診断するスクリプト
 */
async function diagnoseFavoriteComment() {
  // Redis接続
  await connectRedis();
  console.log('='.repeat(80));
  console.log('お気に入り文言 診断スクリプト');
  console.log('='.repeat(80));
  console.log();

  // テスト対象の物件番号
  const testProperties = [
    { number: 'CC9', issue: 'おすすめコメントが表示されない（アピールポイントは表示される）' },
    { number: 'AA1530', issue: '両方表示されない' },
    { number: 'AA10606', issue: '正常に表示される' },
    { number: 'AA13268', issue: '正常に表示される' },
  ];

  const propertyListingService = new PropertyListingService();
  const workTaskService = new WorkTaskService();
  const favoriteCommentService = new FavoriteCommentService();
  const redisClient = getRedisClient();

  for (const testProperty of testProperties) {
    console.log('\n' + '='.repeat(80));
    console.log(`物件番号: ${testProperty.number}`);
    console.log(`問題: ${testProperty.issue}`);
    console.log('='.repeat(80));

    try {
      // 1. 物件情報を取得
      console.log('\n[1] 物件情報を取得中...');
      const property = await propertyListingService.getByPropertyNumber(testProperty.number);

      if (!property) {
        console.log(`❌ 物件が見つかりません: ${testProperty.number}`);
        continue;
      }

      console.log(`✅ 物件ID: ${property.id}`);
      console.log(`   物件タイプ: ${property.property_type}`);
      console.log(`   storage_location: ${property.storage_location || '(なし)'}`);

      // 2. work_tasksからスプレッドシートURLを取得
      console.log('\n[2] work_tasksからスプレッドシートURLを取得中...');
      const workTask = await workTaskService.getByPropertyNumber(testProperty.number);

      if (workTask) {
        console.log(`✅ work_task見つかりました`);
        console.log(`   spreadsheet_url: ${(workTask as any).spreadsheet_url || '(なし)'}`);
      } else {
        console.log(`❌ work_taskが見つかりません`);
      }

      // 3. キャッシュを確認
      console.log('\n[3] キャッシュを確認中...');
      const cacheKey = `favorite-comment:${property.id}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        console.log(`✅ キャッシュあり:`);
        console.log(`   ${cached}`);
        
        // キャッシュをクリア
        console.log('\n   キャッシュをクリアします...');
        await redisClient.del(cacheKey);
        console.log('   ✅ キャッシュクリア完了');
      } else {
        console.log(`ℹ️  キャッシュなし`);
      }

      // 4. お気に入り文言を取得（キャッシュクリア後）
      console.log('\n[4] お気に入り文言を取得中（キャッシュクリア後）...');
      const result = await favoriteCommentService.getFavoriteComment(property.id);

      console.log(`   物件タイプ: ${result.propertyType}`);
      if (result.comment) {
        console.log(`✅ お気に入り文言: "${result.comment}"`);
      } else {
        console.log(`❌ お気に入り文言が取得できませんでした`);
      }

      // 5. 使用されたスプレッドシートURLを確認
      console.log('\n[5] 使用されたスプレッドシートURL:');
      let finalUrl = property.storage_location;
      if (!finalUrl || !finalUrl.includes('/spreadsheets/d/')) {
        finalUrl = (workTask as any)?.spreadsheet_url;
      }
      console.log(`   ${finalUrl || '(なし)'}`);

      // 6. セル位置を確認
      console.log('\n[6] 取得するセル位置:');
      const cellMap: Record<string, string> = {
        '土地': 'B53',
        'land': 'B53',
        '戸建て': 'B142',
        '戸建': 'B142',
        'detached_house': 'B142',
        'マンション': 'B150',
        'apartment': 'B150',
      };
      const cellPosition = cellMap[property.property_type];
      console.log(`   ${cellPosition || '(対応する物件タイプなし)'}`);

    } catch (error: any) {
      console.error(`\n❌ エラー発生: ${error.message}`);
      console.error(error.stack);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('診断完了');
  console.log('='.repeat(80));

  process.exit(0);
}

// 実行
diagnoseFavoriteComment().catch((error) => {
  console.error('診断スクリプトでエラーが発生しました:', error);
  process.exit(1);
});
