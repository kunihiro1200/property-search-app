// APIエンドポイントのエラーを確認
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function checkApiErrors() {
  console.log('=== APIエンドポイントのエラー確認 ===\n');

  // 1. 物件リスト一覧取得
  console.log('1. 物件リスト一覧取得テスト...');
  try {
    const response = await axios.get(`${API_BASE}/api/property-listings?limit=5`);
    console.log('✅ 成功:', response.status);
    console.log('データ件数:', response.data.data?.length || 0);
  } catch (error: any) {
    console.error('❌ エラー:', error.response?.status, error.response?.statusText);
    console.error('エラー詳細:', error.response?.data);
    console.error('エラーメッセージ:', error.message);
  }

  console.log('');

  // 2. 買主リスト一覧取得
  console.log('2. 買主リスト一覧取得テスト...');
  try {
    const response = await axios.get(`${API_BASE}/api/buyers?limit=5`);
    console.log('✅ 成功:', response.status);
    console.log('データ件数:', response.data.data?.length || 0);
  } catch (error: any) {
    console.error('❌ エラー:', error.response?.status, error.response?.statusText);
    console.error('エラー詳細:', error.response?.data);
    console.error('エラーメッセージ:', error.message);
  }
}

checkApiErrors();
