import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testAA13231API() {
  try {
    console.log('🔍 Testing AA13231 API endpoint...\n');
    
    const baseUrl = 'http://localhost:3000/api/public';
    
    // 1. Test public properties list
    console.log('1️⃣ Testing GET /api/public/properties...');
    const listResponse = await axios.get(`${baseUrl}/properties`);
    console.log('   Response type:', typeof listResponse.data);
    console.log('   Is array:', Array.isArray(listResponse.data));
    
    // レスポンスがオブジェクトの場合、propertiesプロパティを確認
    const properties = Array.isArray(listResponse.data) ? listResponse.data : listResponse.data.properties;
    
    if (!properties || !Array.isArray(properties)) {
      console.log('   ❌ Invalid response format');
      console.log('   Response:', JSON.stringify(listResponse.data).substring(0, 200));
      return;
    }
    
    const aa13231 = properties.find((p: any) => p.property_number === 'AA13231');
    
    if (aa13231) {
      console.log('   ✅ AA13231 found in list');
      console.log(`   Property ID: ${aa13231.id}`);
    } else {
      console.log('   ❌ AA13231 not found in list');
      return;
    }
    
    // 2. Test property detail endpoint
    console.log('\n2️⃣ Testing GET /api/public/properties/:id...');
    const detailResponse = await axios.get(`${baseUrl}/properties/${aa13231.id}`);
    const property = detailResponse.data;
    
    console.log('\n📋 Property Details:');
    console.log(`   Property Number: ${property.property_number}`);
    console.log(`   Property Type: ${property.property_type}`);
    console.log(`   ATBB Status: ${property.atbb_status}`);
    console.log(`   Price: ${property.price}`);
    console.log(`   Address: ${property.address}`);
    
    console.log('\n📝 Additional Details:');
    console.log(`   Property About: ${property.property_about ? '✅ Present' : '❌ Missing'}`);
    if (property.property_about) {
      console.log(`      ${property.property_about.substring(0, 100)}...`);
    }
    
    console.log(`   Recommended Comments: ${property.recommended_comments ? `✅ ${property.recommended_comments.length} rows` : '❌ Missing'}`);
    if (property.recommended_comments && property.recommended_comments.length > 0) {
      console.log(`      First row: ${JSON.stringify(property.recommended_comments[0])}`);
    }
    
    console.log(`   Favorite Comment: ${property.favorite_comment ? '✅ Present' : '❌ Missing'}`);
    if (property.favorite_comment) {
      console.log(`      ${property.favorite_comment.substring(0, 100)}...`);
    }
    
    console.log(`   Athome Data: ${property.athome_data ? `✅ ${property.athome_data.length} items` : '❌ Missing'}`);
    if (property.athome_data && property.athome_data.length > 0) {
      console.log(`      First item: ${property.athome_data[0]}`);
    }
    
    console.log('\n✅ API test complete!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAA13231API();
