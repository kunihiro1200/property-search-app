/**
 * 本番環境のAPIをテストして画像取得の問題を診断
 */

const PRODUCTION_URL = 'https://property-site-frontend-kappa.vercel.app';

async function testProductionApi() {
  console.log('🔍 Testing production API...\n');
  
  try {
    // 1. ヘルスチェック
    console.log('1. Health check...');
    const healthRes = await fetch(`${PRODUCTION_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('   Health:', healthData);
    
    // 2. 公開物件一覧（デフォルト）
    console.log('\n2. Fetching properties (default)...');
    const defaultRes = await fetch(`${PRODUCTION_URL}/api/public/properties?limit=5`);
    const defaultData = await defaultRes.json();
    console.log(`   Total: ${defaultData.pagination?.total || 0}`);
    console.log('   First 5 properties:');
    for (const prop of (defaultData.properties || []).slice(0, 5)) {
      console.log(`   - ${prop.property_number}: images=${prop.images?.length || 0}, storage_location=${prop.storage_location ? 'Yes' : 'No'}, atbb_status=${prop.atbb_status}`);
    }
    
    // 3. 公開物件一覧（showPublicOnly=true）
    console.log('\n3. Fetching properties (showPublicOnly=true)...');
    const publicRes = await fetch(`${PRODUCTION_URL}/api/public/properties?limit=5&showPublicOnly=true`);
    const publicData = await publicRes.json();
    console.log(`   Total: ${publicData.pagination?.total || 0}`);
    console.log('   First 5 properties:');
    for (const prop of (publicData.properties || []).slice(0, 5)) {
      console.log(`   - ${prop.property_number}: images=${prop.images?.length || 0}, storage_location=${prop.storage_location ? 'Yes' : 'No'}, atbb_status=${prop.atbb_status}`);
    }
    
    // 4. CC5の画像を直接取得
    console.log('\n4. Fetching CC5 images directly...');
    const cc5ImagesRes = await fetch(`${PRODUCTION_URL}/api/public/properties/CC5/images`);
    const cc5ImagesData = await cc5ImagesRes.json();
    console.log(`   CC5 images: ${cc5ImagesData.images?.length || 0}`);
    if (cc5ImagesData.images?.length > 0) {
      console.log(`   First image: ${cc5ImagesData.images[0].thumbnailUrl}`);
    }
    
    // 5. CC5を物件番号で検索
    console.log('\n5. Searching for CC5 by property number...');
    const cc5SearchRes = await fetch(`${PRODUCTION_URL}/api/public/properties?propertyNumber=CC5`);
    const cc5SearchData = await cc5SearchRes.json();
    console.log(`   Found: ${cc5SearchData.properties?.length || 0}`);
    if (cc5SearchData.properties?.length > 0) {
      const cc5 = cc5SearchData.properties[0];
      console.log(`   CC5: images=${cc5.images?.length || 0}, storage_location=${cc5.storage_location ? 'Yes' : 'No'}`);
      if (cc5.images?.length > 0) {
        console.log(`   First image: ${cc5.images[0].thumbnailUrl}`);
      }
    }
    
    // 6. 画像がある物件を探す
    console.log('\n6. Finding properties with images...');
    const allRes = await fetch(`${PRODUCTION_URL}/api/public/properties?limit=50&showPublicOnly=true`);
    const allData = await allRes.json();
    const withImages = (allData.properties || []).filter((p: any) => p.images?.length > 0);
    console.log(`   Properties with images: ${withImages.length} / ${allData.properties?.length || 0}`);
    if (withImages.length > 0) {
      console.log('   Examples:');
      for (const prop of withImages.slice(0, 5)) {
        console.log(`   - ${prop.property_number}: ${prop.images.length} images`);
      }
    }
    
    // 7. 画像がない物件を分析
    console.log('\n7. Analyzing properties without images...');
    const withoutImages = (allData.properties || []).filter((p: any) => !p.images || p.images.length === 0);
    console.log(`   Properties without images: ${withoutImages.length}`);
    if (withoutImages.length > 0) {
      console.log('   Examples:');
      for (const prop of withoutImages.slice(0, 5)) {
        console.log(`   - ${prop.property_number}: storage_location=${prop.storage_location ? 'Yes' : 'No'}, atbb_status=${prop.atbb_status}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testProductionApi();
