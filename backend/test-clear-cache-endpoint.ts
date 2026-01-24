import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ローカル環境で画像キャッシュクリアエンドポイントをテストするスクリプト
 */
async function testClearCacheEndpoint() {
  console.log('🧪 Testing clear-image-cache endpoint...\n');
  
  // テスト対象のURL
  const baseUrl = 'http://localhost:3000';
  const propertyId = 'CC6';
  const endpoint = `${baseUrl}/api/public/properties/${propertyId}/clear-image-cache`;
  
  console.log(`📍 Endpoint: ${endpoint}\n`);
  
  try {
    console.log('📤 Sending POST request...');
    
    const response = await axios.post(endpoint, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log('✅ Success!');
    console.log('📊 Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error occurred!');
    
    if (error.response) {
      // サーバーからのレスポンスがある場合
      console.error('📊 Response status:', error.response.status);
      console.error('📦 Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('📋 Response headers:', JSON.stringify(error.response.headers, null, 2));
      
      if (error.response.status === 401) {
        console.error('\n⚠️ 401 Unauthorized エラーが発生しました');
        console.error('考えられる原因:');
        console.error('1. バックエンドサーバーが起動していない');
        console.error('2. 認証ミドルウェアがリクエストをブロックしている');
        console.error('3. CORSの設定に問題がある');
      }
    } else if (error.request) {
      // リクエストは送信されたがレスポンスがない場合
      console.error('❌ No response received from server');
      console.error('考えられる原因:');
      console.error('1. バックエンドサーバーが起動していない (http://localhost:3000)');
      console.error('2. ネットワークの問題');
      console.error('\n💡 解決方法:');
      console.error('別のターミナルで以下を実行してください:');
      console.error('  cd backend');
      console.error('  npm run dev');
    } else {
      // リクエストの設定中にエラーが発生した場合
      console.error('❌ Error setting up request:', error.message);
    }
    
    console.error('\n📋 Full error:', error);
  }
}

// スクリプトを実行
testClearCacheEndpoint().catch(console.error);
