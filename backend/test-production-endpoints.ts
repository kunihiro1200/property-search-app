import axios from 'axios';

async function testProductionEndpoints() {
  console.log('=== 本番環境のエンドポイントをテスト ===\n');

  const productionUrl = 'https://property-site-frontend-kappa.vercel.app';
  const endpoints = [
    '/api/health',
    '/api/public/properties',
    '/api/public/properties/CC24',
    '/api/public/properties/CC24/images',
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n--- ${endpoint} ---`);
    try {
      const response = await axios.get(`${productionUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
        },
        validateStatus: () => true,
        timeout: 10000,
      });
      
      console.log('ステータスコード:', response.status);
      console.log('Content-Type:', response.headers['content-type']);
      
      // HTMLが返された場合
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        console.log('❌ HTMLが返されました（バックエンドにルーティングされていません）');
      } else {
        console.log('✅ JSONが返されました');
        if (response.data.success !== undefined) {
          console.log('success:', response.data.success);
        }
        if (response.data.status) {
          console.log('status:', response.data.status);
        }
        if (response.data.properties) {
          console.log('properties数:', response.data.properties.length);
        }
        if (response.data.property) {
          console.log('property_number:', response.data.property.property_number);
        }
        if (response.data.images) {
          console.log('images数:', response.data.images.length);
        }
        if (response.data.error) {
          console.log('エラー:', response.data.error);
        }
      }
      
    } catch (error: any) {
      console.error('❌ エラー:', error.message);
    }
  }
}

testProductionEndpoints().catch(console.error);
