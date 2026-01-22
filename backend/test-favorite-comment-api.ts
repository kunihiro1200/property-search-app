import axios from 'axios';

/**
 * お気に入り文言APIをテストするスクリプト
 */
async function testFavoriteCommentAPI() {
  console.log('='.repeat(80));
  console.log('お気に入り文言API テストスクリプト');
  console.log('='.repeat(80));
  console.log();

  const API_BASE_URL = 'http://localhost:3000';

  // テスト対象の物件
  const testProperties = [
    { number: 'CC9', id: '5dc48a8e-4d87-41e2-ba93-513076014140', issue: 'おすすめコメントが表示されない' },
    { number: 'AA1530', id: 'b390af30-a537-4566-ae74-9355b2ddb7d1', issue: '両方表示されない' },
    { number: 'AA10606', id: '6d7a80cb-0a7b-4f96-b0b0-91362fd7f197', issue: '正常に表示される' },
    { number: 'AA13268', id: '28189349-8ff7-4002-9c73-54ef56f4498d', issue: '正常に表示される' },
  ];

  for (const property of testProperties) {
    console.log('\n' + '='.repeat(80));
    console.log(`物件番号: ${property.number} (${property.id})`);
    console.log(`問題: ${property.issue}`);
    console.log('='.repeat(80));

    try {
      // APIリクエスト
      const url = `${API_BASE_URL}/api/public/properties/${property.id}/favorite-comment`;
      console.log(`\nリクエストURL: ${url}`);
      
      const startTime = Date.now();
      const response = await axios.get(url);
      const responseTime = Date.now() - startTime;

      console.log(`\n✅ レスポンス成功 (${responseTime}ms)`);
      console.log(`ステータスコード: ${response.status}`);
      console.log(`\nレスポンスデータ:`);
      console.log(JSON.stringify(response.data, null, 2));

      // お気に入り文言の有無を確認
      if (response.data.comment) {
        console.log(`\n✅ お気に入り文言あり: "${response.data.comment}"`);
      } else {
        console.log(`\n❌ お気に入り文言なし`);
        if (response.data.error) {
          console.log(`   エラー: ${response.data.error}`);
        }
      }

    } catch (error: any) {
      console.error(`\n❌ APIリクエスト失敗`);
      if (error.response) {
        console.error(`   ステータスコード: ${error.response.status}`);
        console.error(`   レスポンス:`, error.response.data);
      } else if (error.request) {
        console.error(`   リクエストが送信されましたが、レスポンスがありません`);
        console.error(`   サーバーが起動していない可能性があります`);
      } else {
        console.error(`   エラー: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('テスト完了');
  console.log('='.repeat(80));
}

// 実行
testFavoriteCommentAPI().catch((error) => {
  console.error('テストスクリプトでエラーが発生しました:', error);
  process.exit(1);
});
