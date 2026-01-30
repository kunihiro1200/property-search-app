import axios from 'axios';

async function testLocalAPI() {
  console.log('🔍 Testing local API for CC105...\n');
  
  try {
    const response = await axios.get('http://localhost:3000/api/public/properties/CC105');
    
    console.log('✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('📊 Property data:');
    console.log(`  property_number: ${response.data.property?.property_number}`);
    console.log(`  price: ${response.data.property?.price}`);
    console.log(`  sales_price: ${response.data.property?.sales_price}`);
    console.log(`  listing_price: ${response.data.property?.listing_price}`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testLocalAPI().catch(console.error);
