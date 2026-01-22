import fetch from 'node-fetch';

async function diagnoseImagesAPI() {
  console.log('=== AA9743 画像API診断（Vercel本番環境） ===\n');

  const propertyNumber = 'AA9743';
  const propertyUuid = 'd081edb5-363e-452a-805d-d7a59f621fbb';
  const baseUrl = 'https://baikyaku-property-site3.vercel.app';
  
  // 1. Complete APIで物件データを確認
  console.log('1️⃣ Complete APIで物件データを確認...');
  try {
    const completeResponse = await fetch(`${baseUrl}/api/public/properties/${propertyUuid}/complete`);
    console.log(`  ステータス: ${completeResponse.status}`);
    
    if (completeResponse.ok) {
      const data = await completeResponse.json();
      console.log(`  ✅ 物件番号: ${data.property_number}`);
      console.log(`  ✅ storage_location: ${data.storage_location || 'なし'}`);
      console.log(`  ✅ athome_data: ${data.athome_data ? `${data.athome_data.length}件` : 'なし'}`);
    } else {
      console.log(`  ❌ エラー: ${completeResponse.statusText}`);
      const text = await completeResponse.text();
      console.log(`  レスポンス: ${text.substring(0, 200)}`);
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
  
  console.log('\n2️⃣ 画像API（物件番号）でテスト...');
  try {
    const response1 = await fetch(`${baseUrl}/api/public/properties/${propertyNumber}/images`);
    console.log(`  ステータス: ${response1.status} ${response1.statusText}`);
    console.log(`  Content-Type: ${response1.headers.get('content-type')}`);
    
    const text1 = await response1.text();
    console.log(`  レスポンス: ${text1}`);
    
    if (response1.ok) {
      try {
        const data = JSON.parse(text1);
        console.log(`  ✅ 画像数: ${data.images?.length || 0}`);
      } catch (e) {
        console.log(`  ⚠️ JSONパースエラー`);
      }
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
  
  console.log('\n3️⃣ 画像API（UUID）でテスト...');
  try {
    const response2 = await fetch(`${baseUrl}/api/public/properties/${propertyUuid}/images`);
    console.log(`  ステータス: ${response2.status} ${response2.statusText}`);
    console.log(`  Content-Type: ${response2.headers.get('content-type')}`);
    
    const text2 = await response2.text();
    console.log(`  レスポンス: ${text2}`);
    
    if (response2.ok) {
      try {
        const data = JSON.parse(text2);
        console.log(`  ✅ 画像数: ${data.images?.length || 0}`);
      } catch (e) {
        console.log(`  ⚠️ JSONパースエラー`);
      }
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
  
  console.log('\n4️⃣ 環境変数確認API...');
  try {
    const envResponse = await fetch(`${baseUrl}/api/check-env`);
    console.log(`  ステータス: ${envResponse.status}`);
    
    if (envResponse.ok) {
      const data = await envResponse.json();
      console.log(`  GOOGLE_SERVICE_ACCOUNT_JSON: ${data.GOOGLE_SERVICE_ACCOUNT_JSON ? '設定済み' : '未設定'}`);
      console.log(`  SUPABASE_URL: ${data.SUPABASE_URL ? '設定済み' : '未設定'}`);
      console.log(`  SUPABASE_ANON_KEY: ${data.SUPABASE_ANON_KEY ? '設定済み' : '未設定'}`);
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
}

diagnoseImagesAPI();
