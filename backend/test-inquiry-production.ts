import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 本番環境で問合せAPIをテスト
 */
async function testInquiryProduction() {
  const apiUrl = process.env.VERCEL_API_URL || 'https://baikyaku-property-site3.vercel.app';
  
  console.log('🧪 本番環境で問合せAPIをテスト...\n');
  console.log(`API URL: ${apiUrl}\n`);

  try {
    // 実際の物件番号を使用（AA10424は存在する物件）
    const testInquiry = {
      propertyId: 'AA10424',
      name: 'テスト太郎',
      email: 'test@example.com',
      phone: '09012345678',
      message: 'テストメッセージです（本番環境テスト）',
    };

    console.log('📤 問合せを送信中...');
    console.log('   データ:', JSON.stringify(testInquiry, null, 2));

    const response = await axios.post(
      `${apiUrl}/api/public/inquiries`,
      testInquiry,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30秒タイムアウト
      }
    );

    console.log('\n✅ 成功:');
    console.log('   ステータス:', response.status);
    console.log('   レスポンス:', JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('\n❌ エラー:');
    
    if (error.response) {
      // サーバーからのエラーレスポンス
      console.error('   ステータス:', error.response.status);
      console.error('   データ:', JSON.stringify(error.response.data, null, 2));
      console.error('   ヘッダー:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      // リクエストは送信されたがレスポンスがない
      console.error('   リクエストエラー:', error.message);
      console.error('   リクエスト:', error.request);
    } else {
      // リクエスト設定時のエラー
      console.error('   設定エラー:', error.message);
    }
  }
}

testInquiryProduction();
