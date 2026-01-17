import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

/**
 * 手動同期のデバッグテスト
 * 
 * 手動同期APIエンドポイントを呼び出して、エラーの詳細を確認します。
 */
async function testManualSync() {
  console.log('🔍 手動同期のテストを開始します...\n');

  try {
    const response = await axios.post('http://localhost:3000/api/sync/manual', {}, {
      timeout: 30000, // 30秒のタイムアウト
    });

    console.log('✅ 手動同期が成功しました！');
    console.log('📊 結果:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ 手動同期でエラーが発生しました\n');
    
    if (error.response) {
      // サーバーからのエラーレスポンス
      console.error('ステータスコード:', error.response.status);
      console.error('エラーメッセージ:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // リクエストは送信されたがレスポンスがない
      console.error('サーバーからレスポンスがありません');
      console.error('リクエスト:', error.request);
    } else {
      // リクエストの設定中にエラーが発生
      console.error('エラー:', error.message);
    }
    
    console.error('\n詳細なエラー情報:');
    console.error(error);
  }
}

testManualSync();
