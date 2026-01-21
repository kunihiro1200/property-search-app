// 価格フィルターAPIのテスト
import axios from 'axios';

async function testPriceFilterAPI() {
  console.log('=== 価格フィルターAPI修正のテスト ===\n');

  // ローカル環境のAPIをテスト
  const apiUrl = 'http://localhost:3000';

  console.log('【テスト1】マンションで価格1000万〜1500万の物件を検索');
  console.log('APIエンドポイント: GET /api/public/properties');
  console.log('パラメータ:');
  console.log('  - types: apartment');
  console.log('  - minPrice: 1000（万円）');
  console.log('  - maxPrice: 1500（万円）\n');

  try {
    const response = await axios.get(`${apiUrl}/api/public/properties`, {
      params: {
        types: 'apartment',
        minPrice: 1000,
        maxPrice: 1500,
        limit: 100
      }
    });

    const { properties, pagination } = response.data;

    console.log(`検索結果: ${properties.length}件`);
    console.log(`総件数: ${pagination.total}件\n`);

    if (properties.length > 0) {
      console.log('物件一覧:');
      properties.forEach((prop: any, index: number) => {
        const priceInManYen = Math.round(prop.price / 10000);
        console.log(`${index + 1}. ${prop.property_number} - ${prop.address}`);
        console.log(`   価格: ${prop.price.toLocaleString()}円（${priceInManYen}万円）`);
        console.log(`   物件タイプ: ${prop.property_type}`);
      });
    } else {
      console.log('❌ 該当する物件が見つかりませんでした。');
      console.log('修正が正しく適用されていない可能性があります。');
    }

    console.log('\n=== テスト完了 ===');
    
    if (properties.length >= 8) {
      console.log('✅ 修正成功！8件以上の物件が見つかりました。');
    } else {
      console.log('⚠️ 期待される8件以上の物件が見つかりませんでした。');
    }
  } catch (error: any) {
    console.error('❌ APIエラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', error.response.data);
    }
  }
}

testPriceFilterAPI().catch(console.error);
