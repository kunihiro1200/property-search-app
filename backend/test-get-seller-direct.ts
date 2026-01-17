import { SellerService } from './src/services/SellerService.supabase';

async function testGetSeller() {
  const sellerService = new SellerService();
  
  // Test multiple sellers by their IDs
  const testSellers = [
    { number: 'AA3757', id: '0bf2f416-a503-45e9-bca8-162a2142080a' },
    { number: 'AA9592', id: 'b7256c7a-fe89-4a79-a36f-bd168886f2c4' },
    { number: 'AA9591', id: '5b33003b-706b-41e8-8f49-4ab09642a5ba' },
    { number: 'AA9589', id: 'e026de8b-3b42-4c00-aea7-e64c9ad58bc3' },
    { number: 'AA5174', id: 'f0e8c8e5-5b5e-4c8e-8e5e-5b5e4c8e8e5e' }, // Need to find real ID
  ];
  
  for (const test of testSellers) {
    console.log(`\n=== Testing Seller: ${test.number} (${test.id}) ===`);
    
    try {
      const seller = await sellerService.getSeller(test.id);
      
      if (!seller) {
        console.log(`❌ Seller not found`);
        continue;
      }
      
      console.log(`Name: ${seller.name}`);
      console.log(`Site: ${seller.site || 'null'}`);
      console.log(`Status: ${seller.status || 'null'}`);
      console.log(`Property exists: ${!!seller.property}`);
      
      if (seller.property) {
        console.log(`  Address: ${seller.property.address || 'null'}`);
        console.log(`  Type: ${seller.property.propertyType || 'null'}`);
        console.log(`  Land Area: ${seller.property.landArea || 'null'}`);
        console.log(`  Building Area: ${seller.property.buildingArea || 'null'}`);
      } else {
        console.log('⚠️  No property in response');
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

testGetSeller()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
