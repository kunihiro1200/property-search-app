import { PropertyListingService } from './api/src/services/PropertyListingService';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testLocally() {
  console.log('🔍 Testing PropertyListingService locally...\n');

  const service = new PropertyListingService();
  
  try {
    const result = await service.getPublicProperties({
      propertyNumber: 'CC105',
      limit: 1,
      skipImages: false  // 画像取得あり
    });

    console.log('📊 Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.properties.length > 0) {
      const cc105 = result.properties[0];
      console.log('\n💰 Price Analysis:');
      console.log('  price:', cc105.price);
      console.log('  sales_price:', (cc105 as any).sales_price);
      console.log('  listing_price:', (cc105 as any).listing_price);
      
      if (cc105.price === null || cc105.price === undefined || cc105.price === 0) {
        console.log('\n❌ PROBLEM: price is still null/undefined/0');
        console.log('❌ Destructuring is not working correctly');
      } else {
        console.log('\n✅ SUCCESS: price is set correctly!');
        console.log('✅ Expected display:', (cc105.price / 10000).toFixed(0), '万円');
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n✨ Test completed!');
}

testLocally().catch(console.error);
