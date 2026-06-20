import fetch from 'node-fetch';

async function checkServerStatus() {
  console.log('🔍 Checking backend server status...\n');

  try {
    // ローカルサーバーのヘルスチェック
    console.log('📡 Checking http://localhost:3000/health ...');
    const response = await fetch('http://localhost:3000/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend server is RUNNING');
      console.log('   Status:', data.status);
      console.log('   Timestamp:', data.timestamp);
    } else {
      console.log('❌ Backend server returned error:', response.status, response.statusText);
    }
  } catch (error: any) {
    console.log('❌ Backend server is NOT RUNNING');
    console.log('   Error:', error.message);
    console.log('\n💡 To start the backend server:');
    console.log('   cd backend');
    console.log('   npm run dev');
  }
}

checkServerStatus();
