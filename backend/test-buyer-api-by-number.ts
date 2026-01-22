// 買主番号でAPIをテストするスクリプト
import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

async function testBuyerApi() {
  const buyerNumber = 'BY_R1UikR1lpuf7x2';
  
  console.log(`\n=== 買主番号 ${buyerNumber} でAPIテスト ===\n`);
  
  try {
    // APIエンドポイントをテスト
    const response = await axios.get(`${API_BASE}/api/buyers/${buyerNumber}`);
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('API Error Status:', error.response?.status);
    console.log('API Error Data:', error.response?.data);
    console.log('API Error Message:', error.message);
  }
}

testBuyerApi().catch(console.error);
