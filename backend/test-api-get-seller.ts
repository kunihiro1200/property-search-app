import axios from 'axios';

async function testGetSeller() {
  const baseURL = 'http://localhost:3000';
  
  // Login first
  console.log('=== Logging in ===');
  const loginResponse = await axios.post(`${baseURL}/auth/supabase/login`, {
    email: 'admin@example.com',
    password: 'admin123',
  });
  
  const token = loginResponse.data.token;
  console.log('✅ Logged in successfully\n');
  
  // Test multiple sellers
  const sellerNumbers = ['AA3757', 'AA9592', 'AA9591', 'AA9589', 'AA5174'];
  
  for (const sellerNumber of sellerNumbers) {
    console.log(`\n=== Testing Seller: ${sellerNumber} ===`);
    
    // Search for seller by number
    const searchResponse = await axios.get(`${baseURL}/sellers/search`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: sellerNumber },
    });
    
    if (searchResponse.data.length === 0) {
      console.log(`❌ Seller ${sellerNumber} not found in search`);
      continue;
    }
    
    const sellerId = searchResponse.data[0].id;
    console.log(`Seller ID: ${sellerId}`);
    
    // Get seller details
    const sellerResponse = await axios.get(`${baseURL}/sellers/${sellerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const seller = sellerResponse.data;
    console.log(`Name: ${seller.name}`);
    console.log(`Site: ${seller.site || 'null'}`);
    console.log(`Status: ${seller.status || 'null'}`);
    console.log(`Property exists: ${!!seller.property}`);
    
    if (seller.property) {
      console.log(`  Address: ${seller.property.address || 'null'}`);
      console.log(`  Type: ${seller.property.propertyType || 'null'}`);
    } else {
      console.log('⚠️  No property in response');
    }
  }
}

testGetSeller()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  });
