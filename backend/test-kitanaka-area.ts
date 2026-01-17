import { BeppuAreaMappingService } from './src/services/BeppuAreaMappingService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function testKitanakaArea() {
  console.log('=== Testing 北中 Area Mapping ===\n');

  const service = new BeppuAreaMappingService();

  const testAddress = '大分県別府市北中7-1';
  console.log(`Testing address: ${testAddress}\n`);

  const result = await service.getDistributionAreasForAddress(testAddress);

  console.log(`Result: ${result}`);
  console.log(`\nExpected: ㊶㊸⑫ or ⑫㊶㊸`);
  
  if (result) {
    const hasArea36 = result.includes('㊶');
    const hasArea48 = result.includes('㊸');
    const hasArea12 = result.includes('⑫');
    
    console.log(`\nContains ㊶: ${hasArea36}`);
    console.log(`Contains ㊸: ${hasArea48}`);
    console.log(`Contains ⑫: ${hasArea12}`);
    
    if (hasArea36 && hasArea48 && hasArea12) {
      console.log('\n✅ All expected areas are present!');
    } else {
      console.log('\n❌ Missing some expected areas');
    }
  } else {
    console.log('\n❌ No mapping found');
  }
}

testKitanakaArea().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
