import axios from 'axios';

async function testAPI() {
  const baseURL = 'http://localhost:3001';

  try {
    console.log('=== 共有データAPI テスト ===\n');

    // 1. 全件取得
    console.log('1. 全件取得 (GET /api/shared-items)');
    const itemsResponse = await axios.get(`${baseURL}/api/shared-items`);
    console.log('ステータス:', itemsResponse.status);
    console.log('データ件数:', itemsResponse.data.data?.length || 0);

    if (itemsResponse.data.data && itemsResponse.data.data.length > 0) {
      console.log('\n最初のアイテム:');
      const firstItem = itemsResponse.data.data[0];
      console.log(JSON.stringify(firstItem, null, 2));
    } else {
      console.log('データが空です');
    }

    // 2. カテゴリー取得
    console.log('\n2. カテゴリー取得 (GET /api/shared-items/categories)');
    const categoriesResponse = await axios.get(`${baseURL}/api/shared-items/categories`);
    console.log('ステータス:', categoriesResponse.status);
    console.log('カテゴリー数:', categoriesResponse.data.data?.length || 0);

    if (categoriesResponse.data.data && categoriesResponse.data.data.length > 0) {
      console.log('\nカテゴリー一覧:');
      categoriesResponse.data.data.forEach((cat: any) => {
        console.log(`  - ${cat.label} (${cat.count}件)`);
      });
    }

    // 3. スタッフ取得
    console.log('\n3. スタッフ取得 (GET /api/shared-items/staff)');
    const staffResponse = await axios.get(`${baseURL}/api/shared-items/staff`);
    console.log('ステータス:', staffResponse.status);
    console.log('スタッフ数:', staffResponse.data.data?.length || 0);

  } catch (error: any) {
    console.error('\nエラー発生:');
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('エラーメッセージ:', error.response.data);
    } else if (error.request) {
      console.error('サーバーに接続できません。バックエンドサーバーが起動しているか確認してください。');
      console.error('URL:', baseURL);
    } else {
      console.error('エラー:', error.message);
    }
  }
}

testAPI();
