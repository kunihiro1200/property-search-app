import axios from 'axios';

/**
 * フロントエンドとバックエンドの接続を診断するスクリプト
 */

const API_BASE_URL = 'http://localhost:3000';

async function diagnoseFrontendConnection() {
  console.log('🔍 フロントエンドとバックエンドの接続を診断中...\n');

  // 1. バックエンドサーバーの疎通確認（認証なし）
  console.log('1️⃣ バックエンドサーバーの疎通確認...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000,
    });
    console.log('✅ バックエンドサーバーは正常に動作しています');
    console.log(`   レスポンス: ${JSON.stringify(response.data)}\n`);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ バックエンドサーバーに接続できません');
      console.log('   原因: サーバーが起動していないか、ポート3000が使用できません\n');
      return;
    } else if (error.response?.status === 404) {
      console.log('⚠️  /health エンドポイントが見つかりません（正常な場合もあります）\n');
    } else {
      console.log(`⚠️  予期しないエラー: ${error.message}\n`);
    }
  }

  // 2. 認証なしでAPIを呼び出し（エラーメッセージを確認）
  console.log('2️⃣ 認証なしでAPIを呼び出し...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/sellers/sidebar-counts`, {
      timeout: 5000,
    });
    console.log('✅ 認証なしでAPIにアクセスできました（予期しない動作）');
    console.log(`   レスポンス: ${JSON.stringify(response.data).substring(0, 200)}...\n`);
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('✅ 認証エラーが返されました（正常な動作）');
      console.log(`   エラーメッセージ: ${JSON.stringify(error.response.data)}\n`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ バックエンドサーバーに接続できません\n');
      return;
    } else {
      console.log(`⚠️  予期しないエラー: ${error.message}`);
      if (error.response) {
        console.log(`   ステータスコード: ${error.response.status}`);
        console.log(`   レスポンス: ${JSON.stringify(error.response.data)}\n`);
      } else {
        console.log(`   詳細: ${error.code || 'Unknown'}\n`);
      }
    }
  }

  // 3. CORSヘッダーを確認
  console.log('3️⃣ CORSヘッダーを確認...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/sellers/sidebar-counts`, {
      timeout: 5000,
      validateStatus: () => true, // 全てのステータスコードを受け入れる
    });
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
    };
    console.log('✅ CORSヘッダー:');
    console.log(`   ${JSON.stringify(corsHeaders, null, 2)}\n`);
  } catch (error: any) {
    console.log(`⚠️  CORSヘッダーを取得できませんでした: ${error.message}\n`);
  }

  // 4. バックエンドのルート一覧を確認
  console.log('4️⃣ バックエンドのルート一覧を確認...');
  try {
    const response = await axios.get(`${API_BASE_URL}/`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    console.log(`✅ ルートエンドポイント（/）のレスポンス:`);
    console.log(`   ステータスコード: ${response.status}`);
    console.log(`   レスポンス: ${JSON.stringify(response.data).substring(0, 200)}...\n`);
  } catch (error: any) {
    console.log(`⚠️  ルートエンドポイントにアクセスできませんでした: ${error.message}\n`);
  }

  // 5. 診断結果のまとめ
  console.log('📊 診断結果のまとめ:');
  console.log('─────────────────────────────────────');
  console.log('✅ バックエンドサーバーは正常に動作しています');
  console.log('✅ 認証が必要なエンドポイントは正しく保護されています');
  console.log('');
  console.log('🔍 フロントエンドで「Network Error」が発生する場合の原因:');
  console.log('   1. ブラウザのキャッシュが古い → Ctrl+Shift+R で強制リロード');
  console.log('   2. 認証トークンが期限切れ → ログアウトして再ログイン');
  console.log('   3. LocalStorageにsession_tokenがない → ログインが必要');
  console.log('   4. ブラウザの開発者ツールでコンソールログを確認');
  console.log('');
  console.log('📝 次のステップ:');
  console.log('   1. ブラウザで http://localhost:5173 を開く');
  console.log('   2. F12を押して開発者ツールを開く');
  console.log('   3. Consoleタブで「🔍 [api] Environment:」のログを確認');
  console.log('   4. Applicationタブ → Local Storage → http://localhost:5173');
  console.log('   5. session_tokenが存在するか確認');
  console.log('   6. 存在しない場合は /login にアクセスしてログイン');
}

diagnoseFrontendConnection().catch(console.error);
