// 地図ビューのパフォーマンスを診断
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseMapViewPerformance() {
  const productionApiUrl = 'https://baikyaku-property-site3.vercel.app';
  
  console.log('🔍 Diagnosing map view performance...\n');
  
  // Test 1: 地図ビュー用のリクエスト（withCoordinates=true）
  console.log('📊 Test 1: Map view request (withCoordinates=true, limit=1000)');
  const startTime1 = Date.now();
  
  const response1 = await fetch(
    `${productionApiUrl}/api/public/properties?limit=1000&offset=0&withCoordinates=true`
  );
  
  const endTime1 = Date.now();
  const duration1 = endTime1 - startTime1;
  
  const data1 = await response1.json();
  
  console.log(`⏱️  Response time: ${duration1}ms`);
  console.log(`📦 Total properties: ${data1.pagination?.total || 0}`);
  console.log(`📦 Properties returned: ${data1.properties?.length || 0}`);
  
  // 画像データの有無を確認
  if (data1.properties && data1.properties.length > 0) {
    const withImages = data1.properties.filter((p: any) => p.images && p.images.length > 0);
    console.log(`🖼️  Properties with images: ${withImages.length} / ${data1.properties.length}`);
    
    // 最初の3件の画像数を確認
    console.log('\n📸 First 3 properties image count:');
    data1.properties.slice(0, 3).forEach((prop: any) => {
      console.log(`  - ${prop.property_number}: ${prop.images?.length || 0} images`);
    });
  }
  
  // Test 2: 通常のリスト表示リクエスト（limit=20）
  console.log('\n📊 Test 2: List view request (limit=20, no withCoordinates)');
  const startTime2 = Date.now();
  
  const response2 = await fetch(
    `${productionApiUrl}/api/public/properties?limit=20&offset=0`
  );
  
  const endTime2 = Date.now();
  const duration2 = endTime2 - startTime2;
  
  const data2 = await response2.json();
  
  console.log(`⏱️  Response time: ${duration2}ms`);
  console.log(`📦 Total properties: ${data2.pagination?.total || 0}`);
  console.log(`📦 Properties returned: ${data2.properties?.length || 0}`);
  
  // Test 3: 地図ビュー用だが画像なし（理想的なケース）
  console.log('\n📊 Test 3: Ideal map view (withCoordinates=true, limit=200)');
  const startTime3 = Date.now();
  
  const response3 = await fetch(
    `${productionApiUrl}/api/public/properties?limit=200&offset=0&withCoordinates=true`
  );
  
  const endTime3 = Date.now();
  const duration3 = endTime3 - startTime3;
  
  const data3 = await response3.json();
  
  console.log(`⏱️  Response time: ${duration3}ms`);
  console.log(`📦 Total properties: ${data3.pagination?.total || 0}`);
  console.log(`📦 Properties returned: ${data3.properties?.length || 0}`);
  
  // 比較
  console.log('\n📈 Performance Comparison:');
  console.log(`  - Map view (1000 limit): ${duration1}ms`);
  console.log(`  - List view (20 limit): ${duration2}ms`);
  console.log(`  - Map view (200 limit): ${duration3}ms`);
  
  // ボトルネックの特定
  console.log('\n🔍 Bottleneck Analysis:');
  
  if (duration1 > 5000) {
    console.log('  ⚠️  Map view is VERY SLOW (>5s)');
    console.log('  💡 Recommendation: Create lightweight map endpoint without images');
  } else if (duration1 > 2000) {
    console.log('  ⚠️  Map view is SLOW (>2s)');
    console.log('  💡 Recommendation: Optimize image fetching or reduce data');
  } else {
    console.log('  ✅ Map view performance is acceptable (<2s)');
  }
  
  // 画像取得がボトルネックかどうか
  const avgImagesPerProperty = data1.properties?.reduce((sum: number, p: any) => sum + (p.images?.length || 0), 0) / (data1.properties?.length || 1);
  console.log(`\n📊 Average images per property: ${avgImagesPerProperty.toFixed(2)}`);
  
  if (avgImagesPerProperty > 0.5) {
    console.log('  ⚠️  Many properties have images - this may slow down the response');
    console.log('  💡 Consider skipping image fetching for map view');
  }
}

diagnoseMapViewPerformance().catch(console.error);
