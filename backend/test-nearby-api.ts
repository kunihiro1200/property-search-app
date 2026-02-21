import axios from 'axios';

async function testNearbyAPI() {
  try {
    const response = await axios.get('http://localhost:3001/api/buyers/6908/nearby-properties', {
      params: { propertyNumber: 'AA3912' }
    });

    console.log('=== API Response ===');
    console.log('基準物件:', response.data.baseProperty?.property_number);
    console.log('近隣物件数:', response.data.nearbyProperties?.length);
    console.log('\n近隣物件一覧:');
    response.data.nearbyProperties?.forEach((p: any) => {
      console.log(`  - ${p.property_number}: ${p.address}`);
    });

    // AA10976が含まれているか確認
    const hasAA10976 = response.data.nearbyProperties?.some((p: any) => p.property_number === 'AA10976');
    console.log('\nAA10976が含まれている:', hasAA10976);
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testNearbyAPI();
