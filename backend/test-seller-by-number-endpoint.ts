import axios from 'axios';

async function testSellerByNumberEndpoint() {
  console.log('🧪 Testing /api/sellers/by-number/:sellerNumber endpoint...\n');

  try {
    // ログイン（正しいメールアドレスとパスワードを使用）
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'yuuko.yamamoto@ifoo-oita.com',
      password: 'password123',
    });

    console.log('Login response:', loginResponse.data);
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    console.log('Token:', token);
    console.log('');

    // AA13500の情報を取得
    console.log('🔍 Fetching seller data...');
    const response = await axios.get('http://localhost:3000/api/sellers/by-number/AA13500', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Seller data fetched successfully:');
    console.log('  売主番号:', response.data.sellerNumber);
    console.log('  売主ID:', response.data.id);
    console.log('  緯度:', response.data.latitude);
    console.log('  経度:', response.data.longitude);
    console.log('  物件住所:', response.data.propertyAddress);
    console.log('');

    if (response.data.latitude && response.data.longitude) {
      console.log('✅ 座標が正常に取得できました！');
      console.log('📍 ブラウザで通話モードページを開いて、地図が表示されることを確認してください。');
    } else {
      console.log('❌ 座標が取得できませんでした。');
    }
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Error response:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testSellerByNumberEndpoint();
