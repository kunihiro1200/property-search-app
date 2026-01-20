// 本番環境でwithCoordinatesパラメータが正しく動作しているか確認
import dotenv from 'dotenv';

dotenv.config();

async function testWithCoordinatesProduction() {
  const productionApiUrl = 'https://baikyaku-property-site3.vercel.app';
  
  console.log('🔍 Testing withCoordinates parameter on production API...\n');
  
  // Test 1: withCoordinates=true（座標がある物件のみ）
  console.log('📊 Test 1: withCoordinates=true');
  const response1 = await fetch(
    `${productionApiUrl}/api/public/properties?limit=1000&withCoordinates=true`
  );
  const data1 = await response1.json();
  
  console.log(`✅ Total properties with coordinates: ${data1.pagination?.total || 0}`);
  console.log(`✅ Properties returned: ${data1.properties?.length || 0}`);
  
  // 最初の3件の座標を確認
  if (data1.properties && data1.properties.length > 0) {
    console.log('\n📍 First 3 properties with coordinates:');
    data1.properties.slice(0, 3).forEach((prop: any) => {
      console.log(`  - ${prop.property_number}: (${prop.latitude}, ${prop.longitude})`);
    });
  }
  
  // Test 2: withCoordinates=false（全物件）
  console.log('\n📊 Test 2: withCoordinates=false (all properties)');
  const response2 = await fetch(
    `${productionApiUrl}/api/public/properties?limit=1000&withCoordinates=false`
  );
  const data2 = await response2.json();
  
  console.log(`✅ Total properties (all): ${data2.pagination?.total || 0}`);
  console.log(`✅ Properties returned: ${data2.properties?.length || 0}`);
  
  // Test 3: パラメータなし（デフォルト動作）
  console.log('\n📊 Test 3: No withCoordinates parameter (default)');
  const response3 = await fetch(
    `${productionApiUrl}/api/public/properties?limit=1000`
  );
  const data3 = await response3.json();
  
  console.log(`✅ Total properties (default): ${data3.pagination?.total || 0}`);
  console.log(`✅ Properties returned: ${data3.properties?.length || 0}`);
  
  // 比較
  console.log('\n📈 Comparison:');
  console.log(`  - With coordinates: ${data1.pagination?.total || 0} properties`);
  console.log(`  - All properties: ${data2.pagination?.total || 0} properties`);
  console.log(`  - Default (no param): ${data3.pagination?.total || 0} properties`);
  
  // 座標がnullの物件があるか確認
  if (data1.properties && data1.properties.length > 0) {
    const withoutCoords = data1.properties.filter((p: any) => !p.latitude || !p.longitude);
    if (withoutCoords.length > 0) {
      console.log(`\n⚠️ WARNING: ${withoutCoords.length} properties without coordinates in withCoordinates=true response!`);
      console.log('First 3 properties without coordinates:');
      withoutCoords.slice(0, 3).forEach((prop: any) => {
        console.log(`  - ${prop.property_number}: lat=${prop.latitude}, lng=${prop.longitude}`);
      });
    } else {
      console.log('\n✅ All properties in withCoordinates=true response have coordinates');
    }
  }
}

testWithCoordinatesProduction().catch(console.error);
