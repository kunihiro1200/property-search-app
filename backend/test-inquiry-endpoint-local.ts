import axios from 'axios';

async function testInquiryEndpoint() {
  try {
    console.log('問い合わせエンドポイントをテスト中...\n');

    const response = await axios.post('http://localhost:3000/api/public/inquiries', {
      name: 'ローカルテストユーザー',
      email: 'local-test@example.com',
      phone: '090-1234-5678',
      message: 'ローカル環境からのテストメッセージです',
    });

    console.log('レスポンス:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('エラーが発生しました:');
    if (error.response) {
      console.error('ステータスコード:', error.response.status);
      console.error('レスポンス:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testInquiryEndpoint();
