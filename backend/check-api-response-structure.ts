// APIレスポンスの構造を確認
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function checkApiResponseStructure() {
  console.log('=== APIレスポンスの構造確認 ===\n');

  // 1. 物件リスト
  console.log('1. 物件リスト (/api/property-listings)');
  try {
    const response = await axios.get(`${API_BASE}/api/property-listings?limit=2`);
    console.log('ステータス:', response.status);
    console.log('レスポンス構造:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }

  console.log('\n');

  // 2. 業務依頼
  console.log('2. 業務依頼 (/api/work-tasks)');
  try {
    const response = await axios.get(`${API_BASE}/api/work-tasks?limit=2`);
    console.log('ステータス:', response.status);
    console.log('レスポンス構造:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkApiResponseStructure();
