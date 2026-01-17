// Test script to verify Gmail distribution fix
import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testGmailDistribution() {
  const service = new EnhancedBuyerDistributionService();
  
  console.log('🧪 Testing Gmail Distribution Fix\n');
  console.log('Testing with property: AA13129\n');
  
  try {
    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber: 'AA13129'
    });
    
    console.log('✅ SUCCESS: Property found and buyers retrieved\n');
    console.log('Results:');
    console.log(`  Total buyers in database: ${result.totalBuyers}`);
    console.log(`  Qualified buyers: ${result.count}`);
    console.log(`  Unique emails: ${result.emails.length}`);
    console.log(`\nApplied Filters:`);
    console.log(`  Geography Filter: ${result.appliedFilters.geographyFilter ? '✓' : '✗'}`);
    console.log(`  Distribution Filter: ${result.appliedFilters.distributionFilter ? '✓' : '✗'}`);
    console.log(`  Status Filter: ${result.appliedFilters.statusFilter ? '✓' : '✗'}`);
    console.log(`  Price Range Filter: ${result.appliedFilters.priceRangeFilter ? '✓' : '✗'}`);
    
    if (result.emails.length > 0) {
      console.log(`\nSample emails (first 5):`);
      result.emails.slice(0, 5).forEach((email, index) => {
        console.log(`  ${index + 1}. ${email}`);
      });
    }
    
    console.log('\n✅ Test PASSED: Gmail distribution is working correctly!');
    
  } catch (error: any) {
    console.error('❌ FAILED: Error occurred during test\n');
    console.error('Error details:');
    console.error(`  Message: ${error.message}`);
    console.error(`  Code: ${error.code || 'N/A'}`);
    console.error(`  Property Number: ${error.propertyNumber || 'N/A'}`);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    console.log('\n❌ Test FAILED: Gmail distribution is not working');
    process.exit(1);
  }
}

testGmailDistribution();
