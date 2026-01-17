import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function testBuyer3212() {
  const service = new EnhancedBuyerDistributionService();
  const result = await service.getQualifiedBuyersWithAllCriteria({
    propertyNumber: 'AA13129'
  });

  const buyer3212 = result.filteredBuyers.find(b => b.buyer_number === '3212');
  
  const output = {
    totalBuyers: result.totalBuyers,
    qualifiedCount: result.count,
    buyer3212Found: !!buyer3212,
    buyer3212Details: buyer3212 ? {
      email: buyer3212.email,
      filterResults: buyer3212.filterResults,
      isQualified: result.emails.includes(buyer3212.email)
    } : null
  };

  fs.writeFileSync('test-buyer-3212-result.json', JSON.stringify(output, null, 2));
  console.log('Result written to test-buyer-3212-result.json');
  console.log(JSON.stringify(output, null, 2));
}

testBuyer3212().catch(console.error);
