import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testOscarFiltering() {
  console.log('Testing oscar.yag74@gmail.com filtering for AA5852...\n');

  const service = new EnhancedBuyerDistributionService();

  try {
    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber: 'AA5852'
    });

    console.log('\nFiltering Results:');
    console.log(`Total Buyers: ${result.totalBuyers}`);
    console.log(`Qualified Buyers: ${result.count}`);
    console.log(`Unique Emails: ${result.emails.length}`);
    console.log('');

    // Check if oscar is included
    const oscarIncluded = result.emails.includes('oscar.yag74@gmail.com');
    console.log(`oscar.yag74@gmail.com included: ${oscarIncluded ? 'YES ✓' : 'NO ✗'}`);
    console.log('');

    if (oscarIncluded) {
      console.log('SUCCESS: Oscar is now included in the filtering results!');
      
      // Find oscar's details
      const oscarBuyer = result.filteredBuyers.find(b => b.email === 'oscar.yag74@gmail.com');
      if (oscarBuyer) {
        console.log('\nOscar Buyer Details:');
        console.log(`  Buyer Number: ${oscarBuyer.buyer_number}`);
        console.log(`  Distribution Type: ${oscarBuyer.distribution_type}`);
        console.log(`  Status: ${oscarBuyer.latest_status}`);
        console.log(`  Filter Results:`);
        console.log(`    Geography: ${oscarBuyer.filterResults.geography ? 'PASS' : 'FAIL'}`);
        console.log(`    Distribution: ${oscarBuyer.filterResults.distribution ? 'PASS' : 'FAIL'}`);
        console.log(`    Status: ${oscarBuyer.filterResults.status ? 'PASS' : 'FAIL'}`);
        console.log(`    Price Range: ${oscarBuyer.filterResults.priceRange ? 'PASS' : 'FAIL'}`);
      }
    } else {
      console.log('PROBLEM: Oscar is still not included.');
      
      // Find oscar in filtered buyers to see why
      const oscarBuyer = result.filteredBuyers.find(b => b.email === 'oscar.yag74@gmail.com');
      if (oscarBuyer) {
        console.log('\nOscar Filter Results:');
        console.log(`  Geography: ${oscarBuyer.filterResults.geography ? 'PASS' : 'FAIL'}`);
        console.log(`  Distribution: ${oscarBuyer.filterResults.distribution ? 'PASS' : 'FAIL'}`);
        console.log(`  Status: ${oscarBuyer.filterResults.status ? 'PASS' : 'FAIL'}`);
        console.log(`  Price Range: ${oscarBuyer.filterResults.priceRange ? 'PASS' : 'FAIL'}`);
        console.log(`\n  Distribution Type: "${oscarBuyer.distribution_type}"`);
        console.log(`  Status: "${oscarBuyer.latest_status}"`);
      } else {
        console.log('\nOscar not found in filtered buyers at all!');
      }
    }

    console.log('\nFirst 10 qualified buyers:');
    result.emails.slice(0, 10).forEach((email, i) => {
      console.log(`  ${i + 1}. ${email}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

testOscarFiltering().catch(console.error);
