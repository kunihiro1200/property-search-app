// AA13069の本番環境APIをテスト
async function testProductionAPI() {
  console.log('🔍 Testing AA13069 production API...\n');

  const propertyNumber = 'AA13069';
  // バックエンドのVercelプロジェクト
  const productionUrl = 'https://backend-kunihiro1200s-projects.vercel.app';

  try {
    console.log('📡 Fetching from production /complete endpoint...');
    console.log(`URL: ${productionUrl}/public-properties/properties/${propertyNumber}/complete\n`);

    const response = await fetch(
      `${productionUrl}/public-properties/properties/${propertyNumber}/complete`
    );

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();

    console.log('📊 Response data:');
    console.log('─────────────────────────────────────────────────────────');
    console.log('Property Number:', data.property_number);
    console.log('\n1️⃣ Favorite Comment:');
    console.log(data.favorite_comment || '❌ null');
    
    console.log('\n2️⃣ Recommended Comments:');
    if (data.recommended_comments && Array.isArray(data.recommended_comments) && data.recommended_comments.length > 0) {
      console.log(`✅ ${data.recommended_comments.length}件`);
      data.recommended_comments.forEach((comment: string, index: number) => {
        console.log(`  ${index + 1}. ${comment}`);
      });
    } else {
      console.log('❌ null or empty');
    }

    console.log('\n3️⃣ Property About:');
    console.log(data.property_about || '❌ null');

    console.log('\n4️⃣ Athome Data:');
    if (data.athome_data && Array.isArray(data.athome_data) && data.athome_data.length > 0) {
      console.log(`✅ ${data.athome_data.length}件`);
    } else {
      console.log('❌ null or empty');
    }

    console.log('\n─────────────────────────────────────────────────────────');
    console.log('\n🔍 Analysis:');
    
    const hasAllData = data.favorite_comment && 
                      data.recommended_comments && 
                      Array.isArray(data.recommended_comments) && 
                      data.recommended_comments.length > 0 &&
                      data.property_about;

    if (hasAllData) {
      console.log('✅ All comment data is present');
    } else {
      console.log('⚠️  Some comment data is missing:');
      if (!data.favorite_comment) console.log('   - favorite_comment is missing');
      if (!data.recommended_comments || !Array.isArray(data.recommended_comments) || data.recommended_comments.length === 0) {
        console.log('   - recommended_comments is missing or empty');
      }
      if (!data.property_about) console.log('   - property_about is missing');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testProductionAPI();
