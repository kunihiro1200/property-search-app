import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function testAA6381() {
  console.log('=== AA6381のAPIテスト ===\n');

  try {
    // 物件詳細を取得
    console.log('GET /api/property-listings/AA6381');
    const response = await axios.get(`${API_URL}/api/property-listings/AA6381`);
    console.log('ステータス:', response.status);
    console.log('データ:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('エラー:', error.response?.status, error.response?.data || error.message);
  }

  console.log('\n=== 買主リストを取得 ===\n');
  try {
    const response = await axios.get(`${API_URL}/api/property-listings/AA6381/buyers`);
    console.log('ステータス:', response.status);
    console.log('買主数:', response.data.length);
    console.log('買主リスト:', JSON.stringify(response.data.slice(0, 3), null, 2));
  } catch (error: any) {
    console.error('エラー:', error.response?.status, error.response?.data || error.message);
  }
}

testAA6381();
