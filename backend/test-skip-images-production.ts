// skipImagesパラメータのテスト（本番環境）
import dotenv from 'dotenv';

dotenv.config();

async function testSkipImagesProduction() {
  const productionApiUrl = 'https://baikyaku-property-site3.vercel.app';
  
  console.log('🔍 Testing skipImages parameter on production...\n');
  
  // Test 1: skipImages=false（通常の画像取得）
  console.log('📊 Test 1: skipImages=false (with images)');
  const start1 = Date.now();
  const response1 = await fetch(
    `${productionApiUrl}/api/public/properties?limit=10&withCoordinates=true&skipImages=false`
  );
  const duration1 = Date.now() - start1;
  const data1 = await response1.json();
  
  console.log(`⏱️  Duration: ${duration1}ms`);
  console.log(`📦 Properties: ${data1.properties?.length || 0}`);
  console.log(`🖼️  First property images: ${data1.properties?.[0]?.images?.length || 0}`);
  
  // Test 2: skipImages=true（画像取得をスキップ）
  console.log('\n📊 Test 2: skipImages=true (no images)');
  const start2 = Date.now();
  const response2 = await fetch(
    `${productionApiUrl}/api/public/properties?limit=10&withCoordinates=true&skipImages=true`
  );
  const duration2 = Date.now() - start2;
  const data2 = await response2.json();
  
  console.log(`⏱️  Duration: ${duration2}ms`);
  console.log(`📦 Properties: ${data2.properties?.length || 0}`);
  console.log(`🖼️  First property images: ${data2.properties?.[0]?.images?.length || 0}`);
  
  // 比較
  console.log('\n📈 Performance Comparison:');
  console.log(`  - With images: ${duration1}ms`);
  console.log(`  - Without images: ${duration2}ms`);
  const improvement = ((duration1 - duration2) / duration1 * 100).toFixed(1);
  console.log(`  - Speed improvement: ${improvement}%`);
  
  // Test 3: 地図ビュー用（184件全件、画像なし）
  console.log('\n📊 Test 3: Map view (all 184 properties, no images)');
  const start3 = Date.now();
  const response3 = await fetch(
    `${productionApiUrl}/api/public/properties?limit=1000&withCoordinates=true&skipImages=true`
  );
  const duration3 = Date.now() - start3;
  const data3 = await response3.json();
  
  console.log(`⏱️  Duration: ${duration3}ms`);
  console.log(`📦 Total properties: ${data3.pagination?.total || 0}`);
  console.log(`📦 Properties returned: ${data3.properties?.length || 0}`);
  console.log(`✅ All properties have empty images: ${data3.properties?.every((p: any) => p.images.length === 0)}`);
  
  // 結論
  console.log('\n🎯 Conclusion:');
  if (duration3 < 1000) {
    console.log('  ✅ Map view is FAST (<1s) - Excellent!');
  } else if (duration3 < 2000) {
    console.log('  ✅ Map view is acceptable (<2s)');
  } else {
    console.log('  ⚠️  Map view is still slow (>2s)');
  }
}

testSkipImagesProduction().catch(console.error);
