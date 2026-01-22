import fetch from 'node-fetch';

async function testHealthEndpoints() {
  console.log('=== ヘルスチェックエンドポイントのテスト ===\n');

  const baseUrl = 'https://baikyaku-property-site3.vercel.app';
  
  const endpoints = [
    '/health',
    '/api/health',
    '/api/test/routes',
  ];
  
  for (const endpoint of endpoints) {
    console.log(`テスト: ${endpoint}`);
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      console.log(`  ステータス: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ レスポンス:`, data);
      } else {
        const text = await response.text();
        console.log(`  ❌ エラー: ${text.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.error(`  ❌ 例外:`, error.message);
    }
    console.log('');
  }
}

testHealthEndpoints();
