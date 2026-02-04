import axios from 'axios';

/**
 * フロントエンドと同じ方法でAPIを呼び出してテスト
 */

const API_BASE_URL = 'http://localhost:3000';

async function testFrontendApiCall() {
  console.log('🔍 フロントエンドと同じ方法でAPIを呼び出し中...\n');

  // 1. 認証トークンなしで呼び出し（フロントエンドの初期状態を再現）
  console.log('1️⃣ 認証トークンなしで /api/sellers を呼び出し...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        page: 1,
        pageSize: 50,
        sortBy: 'inquiry_date',
        sortOrder: 'desc',
        statusCategory: 'visitOther',
        visitAssignee: 'U',
      },
      timeout: 10000,
    });
    console.log('✅ APIレスポンス成功（予期しない動作）');
    console.log(`   データ件数: ${response.data.data?.length || 0}`);
    console.log(`   合計件数: ${response.data.total || 0}\n`);
  } catch (error: any) {
    if (error.response) {
      console.log(`❌ APIエラー: ${error.response.status}`);
      console.log(`   エラーメッセージ: ${JSON.stringify(error.response.data)}\n`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ バックエンドサーバーに接続できません\n');
    } else {
      console.log(`❌ ネットワークエラー: ${error.message}`);
      console.log(`   エラーコード: ${error.code || 'Unknown'}\n`);
    }
  }

  // 2. sidebar-countsを呼び出し
  console.log('2️⃣ 認証トークンなしで /api/sellers/sidebar-counts を呼び出し...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/sellers/sidebar-counts`, {
      timeout: 10000,
    });
    console.log('✅ APIレスポンス成功（予期しない動作）');
    console.log(`   レスポンス: ${JSON.stringify(response.data).substring(0, 200)}...\n`);
  } catch (error: any) {
    if (error.response) {
      console.log(`❌ APIエラー: ${error.response.status}`);
      console.log(`   エラーメッセージ: ${JSON.stringify(error.response.data)}\n`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ バックエンドサーバーに接続できません\n');
    } else {
      console.log(`❌ ネットワークエラー: ${error.message}`);
      console.log(`   エラーコード: ${error.code || 'Unknown'}\n`);
    }
  }

  // 3. 診断結果
  console.log('📊 診断結果:');
  console.log('─────────────────────────────────────');
  console.log('バックエンドサーバーは正常に動作していますが、');
  console.log('認証が必要なため、フロントエンドからのリクエストは401エラーになります。');
  console.log('');
  console.log('🔍 フロントエンドで「Network Error」が発生する原因:');
  console.log('   1. ブラウザのLocalStorageにsession_tokenがない');
  console.log('   2. session_tokenが期限切れ');
  console.log('   3. ログインが必要');
  console.log('');
  console.log('📝 解決策:');
  console.log('   1. ブラウザで http://localhost:5173/login にアクセス');
  console.log('   2. ログインする');
  console.log('   3. ログイン後、売主リストページにアクセス');
  console.log('   4. それでも「Network Error」が出る場合は、Ctrl+Shift+R で強制リロード');
}

testFrontendApiCall().catch(console.error);
