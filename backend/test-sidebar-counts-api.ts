import axios from 'axios';

async function test() {
  try {
    // ログインしてトークンを取得
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'test123',
    });
    
    const token = loginResponse.data.token;
    console.log('ログイン成功');
    
    // サイドバーカウントを取得
    const response = await axios.get('http://localhost:3000/api/sellers/sidebar-counts', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log('=== サイドバーカウント ===');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

test();
