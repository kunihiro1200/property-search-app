import axios from 'axios';

async function testMultiplePropertiesImages() {
  console.log('=== 本番環境で複数物件の画像エンドポイントをテスト ===\n');

  const productionUrl = 'https://property-site-frontend-kappa.vercel.app';
  const properties = ['CC24', 'AA9743', 'CC23', 'AA13129'];
  
  for (const propertyNumber of properties) {
    console.log(`\n--- ${propertyNumber} ---`);
    try {
      const response = await axios.get(`${productionUrl}/api/public/properties/${propertyNumber}/images`, {
        headers: {
          'Accept': 'application/json',
        },
        validateStatus: () => true,
      });
      
      console.log('ステータスコード:', response.status);
      console.log('Content-Type:', response.headers['content-type']);
      
      // HTMLが返された場合
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        console.log('❌ HTMLが返されました');
      } else {
        console.log('✅ JSONが返されました');
        console.log('画像数:', response.data.images?.length || 0);
        if (response.data.error) {
          console.log('エラー:', response.data.error);
          console.log('メッセージ:', response.data.message);
        }
      }
      
    } catch (error: any) {
      console.error('❌ エラー:', error.message);
    }
  }
}

testMultiplePropertiesImages().catch(console.error);
