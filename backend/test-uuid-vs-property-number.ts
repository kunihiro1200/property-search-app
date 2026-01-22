import fetch from 'node-fetch';

async function testBoth() {
  console.log('=== UUID vs 物件番号 テスト ===\n');

  const baseUrl = 'https://baikyaku-property-site3.vercel.app';
  const propertyUuid = 'd081edb5-363e-452a-805d-d7a59f621fbb';
  const propertyNumber = 'AA9743';
  
  // 1. UUIDでテスト
  console.log('1️⃣ UUID でテスト...');
  try {
    const response = await fetch(`${baseUrl}/api/public/properties/${propertyUuid}/images`);
    console.log(`  ステータス: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ 成功！画像数: ${data.images?.length || 0}`);
    } else {
      const text = await response.text();
      console.log(`  ❌ 失敗: ${text.substring(0, 200)}`);
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
  
  // 2. 物件番号でテスト
  console.log('\n2️⃣ 物件番号でテスト...');
  try {
    const response = await fetch(`${baseUrl}/api/public/properties/${propertyNumber}/images`);
    console.log(`  ステータス: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ 成功！画像数: ${data.images?.length || 0}`);
    } else {
      const text = await response.text();
      console.log(`  ❌ 失敗: ${text.substring(0, 200)}`);
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
}

testBoth();
