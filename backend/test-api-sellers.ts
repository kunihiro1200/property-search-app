import axios from 'axios';

async function testSellersAPI() {
  const baseURL = 'http://localhost:3000';
  
  console.log('🔍 売主API をテスト中...\n');

  try {
    // 売主一覧を取得
    console.log('1. 売主一覧を取得中...');
    const response = await axios.get(`${baseURL}/api/sellers`, {
      params: { page: 1, limit: 5 }
    });
    
    console.log(`✅ ステータス: ${response.status}`);
    console.log(`📊 取得件数: ${response.data.sellers?.length || 0}件`);
    console.log(`📊 総件数: ${response.data.total || 0}件\n`);

    if (response.data.sellers && response.data.sellers.length > 0) {
      console.log('📋 最初の売主:');
      const seller = response.data.sellers[0];
      console.log(`   売主番号: ${seller.seller_number}`);
      console.log(`   名前: ${seller.name}`);
      console.log(`   サイト: ${seller.site || 'なし'}`);
      console.log(`   ステータス: ${seller.status || 'なし'}\n`);

      // 特定の売主を取得
      console.log(`2. 売主 ${seller.seller_number} の詳細を取得中...`);
      const detailResponse = await axios.get(`${baseURL}/api/sellers/${seller.id}`);
      console.log(`✅ ステータス: ${detailResponse.status}`);
      console.log(`✅ 売主詳細を正常に取得しました\n`);
    }

    console.log('✅ 全てのテストが成功しました！');
  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    if (error.response) {
      console.error(`   ステータス: ${error.response.status}`);
      console.error(`   メッセージ: ${error.response.data?.error || error.message}`);
    } else if (error.request) {
      console.error('   サーバーに接続できません。バックエンドが起動していることを確認してください。');
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

testSellersAPI();
