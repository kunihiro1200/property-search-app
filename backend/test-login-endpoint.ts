/**
 * ログインエンドポイントをテスト
 */
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testLogin() {
  try {
    console.log('🔐 Testing login endpoint...\n');

    const baseUrl = 'http://localhost:3000';
    
    // テスト用の認証情報
    const testEmail = 'tomoko.kunihiro@ifoo-oita.com';
    const testPassword = 'password123'; // デフォルトパスワード（変更されている可能性あり）

    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${'*'.repeat(testPassword.length)}\n`);

    // ログインリクエスト
    const response = await axios.post(`${baseUrl}/api/auth/login`, {
      email: testEmail,
      password: testPassword,
    });

    console.log('✅ Login successful!');
    console.log('📊 Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(response.data, null, 2));

    if (response.data.user) {
      console.log('\n👤 User info:');
      console.log('   - ID:', response.data.user.id);
      console.log('   - Email:', response.data.user.email);
      console.log('   - Role:', response.data.user.role);
    }

    if (response.data.session) {
      console.log('\n🎫 Session info:');
      console.log('   - Access token:', response.data.session.access_token ? '✓ Present' : '✗ Missing');
      console.log('   - Refresh token:', response.data.session.refresh_token ? '✓ Present' : '✗ Missing');
    }

  } catch (error: any) {
    console.error('❌ Login failed!');
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📦 Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('📡 No response received from server');
      console.error('   Make sure backend is running on http://localhost:3000');
    } else {
      console.error('⚠️  Error:', error.message);
    }
    
    process.exit(1);
  }
}

testLogin();
