// Test: Email consolidation with same areas
// kouten0909@icloud.com has 2 records (1811 and 4782) with same desired_area "①②③④⑥⑦"
// Property AA4160 has distribution_areas "⑩㊶㊸"
// Expected: No common areas, buyer should NOT receive distribution

import { createClient } from '@supabase/supabase-js';
import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testEmailConsolidationSameAreas() {
  console.log('=== Test: Email Consolidation with Same Areas ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. Check buyer records for kouten0909@icloud.com
  console.log('1. Checking buyer records for kouten0909@icloud.com...');
  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('buyer_number, email, desired_area, latest_status, distribution_type')
    .ilike('email', 'kouten0909@icloud.com');

  if (buyersError) {
    console.error('Error fetching buyers:', buyersError);
    return;
  }

  console.log(`Found ${buyers.length} buyer records:`);
  buyers.forEach(buyer => {
    console.log(`  - Buyer ${buyer.buyer_number}: ${buyer.email}`);
    console.log(`    Desired area: ${buyer.desired_area}`);
    console.log(`    Status: ${buyer.latest_status}`);
    console.log(`    Distribution type: ${buyer.distribution_type}`);
  });
  console.log('');

  // 2. Check property AA4160
  console.log('2. Checking property AA4160...');
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA4160')
    .single();

  if (propertyError) {
    console.error('Error fetching property:', propertyError);
    return;
  }

  console.log(`Property: ${property.property_number}`);
  console.log(`Address: ${property.address}`);
  console.log(`Distribution areas: ${property.distribution_areas}`);
  console.log('');

  // 3. Run distribution calculation
  console.log('3. Running distribution calculation with email consolidation...');
  const service = new EnhancedBuyerDistributionService();
  
  try {
    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber: 'AA4160'
    });

    console.log('\n=== Distribution Results ===');
    console.log(`Total buyer records: ${result.totalBuyers}`);
    console.log(`Qualified buyers: ${result.count}`);
    console.log(`Unique emails: ${result.emails.length}`);
    console.log('');

    // 4. Check if kouten0909@icloud.com is in the results
    const isIncluded = result.emails.some(email => 
      email.toLowerCase() === 'kouten0909@icloud.com'
    );

    console.log('=== Test Result ===');
    console.log(`kouten0909@icloud.com included in distribution: ${isIncluded}`);
    console.log(`Expected: false (no common areas)`);
    console.log(`Test ${isIncluded ? 'FAILED ❌' : 'PASSED ✅'}`);
    console.log('');

    // 5. Show filtered buyer details for this email
    const buyerDetails = result.filteredBuyers.find(b => 
      b.email.toLowerCase() === 'kouten0909@icloud.com'
    );

    if (buyerDetails) {
      console.log('=== Buyer Details ===');
      console.log(`Buyer numbers: ${buyerDetails.buyer_number}`);
      console.log(`Email: ${buyerDetails.email}`);
      console.log(`Consolidated desired area: ${buyerDetails.desired_area}`);
      console.log(`Status: ${buyerDetails.latest_status}`);
      console.log(`Filter results:`);
      console.log(`  - Geography: ${buyerDetails.filterResults.geography ? 'PASS' : 'FAIL'}`);
      console.log(`  - Distribution: ${buyerDetails.filterResults.distribution ? 'PASS' : 'FAIL'}`);
      console.log(`  - Status: ${buyerDetails.filterResults.status ? 'PASS' : 'FAIL'}`);
      console.log(`  - Price Range: ${buyerDetails.filterResults.priceRange ? 'PASS' : 'FAIL'}`);
      
      if (buyerDetails.geographicMatch) {
        console.log(`Geographic match type: ${buyerDetails.geographicMatch.matchType}`);
        if (buyerDetails.geographicMatch.matchedAreas) {
          console.log(`Matched areas: ${buyerDetails.geographicMatch.matchedAreas.join('')}`);
        }
      }
    }

  } catch (error) {
    console.error('Error running distribution:', error);
  }
}

testEmailConsolidationSameAreas().catch(console.error);
