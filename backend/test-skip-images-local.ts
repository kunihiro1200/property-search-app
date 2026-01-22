// skipImagesパラメータのテスト（ローカル環境）
import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';

dotenv.config();

async function testSkipImagesLocal() {
  const service = new PropertyListingService();
  
  console.log('🔍 Testing skipImages parameter locally...\n');
  
  // Test 1: skipImages=false（通常の画像取得）
  console.log('📊 Test 1: skipImages=false (with images)');
  const start1 = Date.now();
  const result1 = await service.getPublicProperties({
    limit: 10,
    withCoordinates: true,
    skipImages: false,
  });
  const duration1 = Date.now() - start1;
  
  console.log(`⏱️  Duration: ${duration1}ms`);
  console.log(`📦 Properties: ${result1.properties.length}`);
  console.log(`🖼️  First property images: ${result1.properties[0]?.images?.length || 0}`);
  
  // Test 2: skipImages=true（画像取得をスキップ）
  console.log('\n📊 Test 2: skipImages=true (no images)');
  const start2 = Date.now();
  const result2 = await service.getPublicProperties({
    limit: 10,
    withCoordinates: true,
    skipImages: true,
  });
  const duration2 = Date.now() - start2;
  
  console.log(`⏱️  Duration: ${duration2}ms`);
  console.log(`📦 Properties: ${result2.properties.length}`);
  console.log(`🖼️  First property images: ${result2.properties[0]?.images?.length || 0}`);
  
  // 比較
  console.log('\n📈 Performance Comparison:');
  console.log(`  - With images: ${duration1}ms`);
  console.log(`  - Without images: ${duration2}ms`);
  console.log(`  - Speed improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);
  
  // Test 3: 大量データでテスト（184件全件）
  console.log('\n📊 Test 3: All properties with coordinates (184 properties)');
  const start3 = Date.now();
  const result3 = await service.getPublicProperties({
    limit: 1000,
    withCoordinates: true,
    skipImages: true,
  });
  const duration3 = Date.now() - start3;
  
  console.log(`⏱️  Duration: ${duration3}ms`);
  console.log(`📦 Properties: ${result3.properties.length}`);
  console.log(`✅ All properties have empty images array: ${result3.properties.every(p => p.images.length === 0)}`);
}

testSkipImagesLocal().catch(console.error);
