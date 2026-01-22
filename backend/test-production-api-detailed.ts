import axios from 'axios';

async function testProductionAPI() {
  try {
    console.log('🔍 Testing production API...');
    
    const response = await axios.get('https://baikyaku-property-site3.vercel.app/api/public/properties?limit=3');
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Total properties:', response.data.pagination?.total);
    console.log('📦 Properties returned:', response.data.properties?.length);
    
    if (response.data.properties && response.data.properties.length > 0) {
      console.log('\n📋 First 3 properties:');
      response.data.properties.forEach((prop: any, index: number) => {
        console.log(`\n${index + 1}. ${prop.property_number} (${prop.address})`);
        console.log(`   - has_storage_location: ${!!prop.storage_location}`);
        console.log(`   - storage_location: ${prop.storage_location || 'なし'}`);
        console.log(`   - has_image_url: ${!!prop.image_url}`);
        console.log(`   - image_url: ${prop.image_url || 'なし'}`);
        console.log(`   - images count: ${prop.images?.length || 0}`);
        console.log(`   - images: ${JSON.stringify(prop.images || [])}`);
      });
    } else {
      console.log('⚠️ No properties returned');
    }
  } catch (error: any) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testProductionAPI();
