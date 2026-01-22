// 物件リストAPIのテスト
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function testPropertyListingAPI() {
  console.log('=== 物件リストAPI テスト ===\n');

  try {
    // 1. 一覧取得テスト
    console.log('1. 一覧取得テスト...');
    const listResponse = await axios.get(`${API_BASE}/api/property-listings?limit=5`);
    console.log(`✓ 一覧取得成功: ${listResponse.data.data.length}件取得`);
    
    if (listResponse.data.data.length > 0) {
      const firstProperty = listResponse.data.data[0];
      console.log(`  最初の物件: ${firstProperty.property_number}`);
      
      // 2. 個別取得テスト
      console.log(`\n2. 個別取得テスト (${firstProperty.property_number})...`);
      const detailResponse = await axios.get(`${API_BASE}/api/property-listings/${firstProperty.property_number}`);
      console.log('✓ 個別取得成功');
      console.log(`  物件番号: ${detailResponse.data.property_number}`);
      console.log(`  住所: ${detailResponse.data.address || detailResponse.data.display_address || '(なし)'}`);
      console.log(`  Google Map URL: ${detailResponse.data.google_map_url || '(なし)'}`);
      
      // 3. 買主リスト取得テスト
      console.log(`\n3. 買主リスト取得テスト (${firstProperty.property_number})...`);
      try {
        const buyersResponse = await axios.get(`${API_BASE}/api/property-listings/${firstProperty.property_number}/buyers`);
        console.log(`✓ 買主リスト取得成功: ${buyersResponse.data.length}件`);
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('  買主なし (404)');
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n=== すべてのテスト成功 ===');
  } catch (error: any) {
    console.error('\n❌ エラー発生:');
    if (error.response) {
      console.error(`  ステータス: ${error.response.status}`);
      console.error(`  メッセージ: ${error.response.data?.error || error.response.statusText}`);
      console.error(`  URL: ${error.config?.url}`);
    } else if (error.request) {
      console.error('  サーバーに接続できません');
      console.error('  バックエンドが起動しているか確認してください');
    } else {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}

testPropertyListingAPI();
