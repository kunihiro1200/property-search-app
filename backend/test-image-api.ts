import axios from 'axios';

async function testImageAPI() {
  console.log('🧪 Testing image API for seller AA13225...\n');
  
  const baseURL = 'http://localhost:3000';
  const sellerNumber = 'AA13225';
  
  try {
    // まずログインしてトークンを取得（必要な場合）
    console.log('1️⃣ Testing GET /api/emails/images/:sellerNumber');
    const response = await axios.get(`${baseURL}/api/emails/images/${sellerNumber}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('📊 Response data:');
    console.log('  Total images:', response.data.count);
    console.log('  Exterior images:', response.data.categorized?.exterior?.length || 0);
    console.log('  Interior images:', response.data.categorized?.interior?.length || 0);
    console.log('  Uncategorized images:', response.data.categorized?.uncategorized?.length || 0);
    console.log('  Auto-selected exterior:', response.data.autoSelected?.exterior || 'None');
    console.log('  Auto-selected interior:', response.data.autoSelected?.interior || 'None');
    
    if (response.data.categorized?.exterior?.length > 0) {
      console.log('\n📸 Exterior images:');
      response.data.categorized.exterior.slice(0, 3).forEach((img: any, i: number) => {
        console.log(`  ${i + 1}. ${img.name} (ID: ${img.id})`);
      });
    }
    
    if (response.data.categorized?.interior?.length > 0) {
      console.log('\n🏠 Interior images:');
      response.data.categorized.interior.slice(0, 3).forEach((img: any, i: number) => {
        console.log(`  ${i + 1}. ${img.name} (ID: ${img.id})`);
      });
    }
    
    if (response.data.categorized?.uncategorized?.length > 0) {
      console.log('\n📦 Uncategorized images (first 5):');
      response.data.categorized.uncategorized.slice(0, 5).forEach((img: any, i: number) => {
        console.log(`  ${i + 1}. ${img.name} (ID: ${img.id})`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testImageAPI().catch(console.error);
