// Test: Property AA4160 with buyer kouten0909@icloud.com
// This is the original bug report case
// After email consolidation fix, buyer should be correctly excluded (no common areas)

import { createClient } from '@supabase/supabase-js';
import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testAA4160Buyer2064Fixed() {
  console.log('=== Test: AA4160 with Buyer kouten0909@icloud.com (Bug Fix Verification) ===\n');
  console.log('Original Issue: Buyer was incorrectly receiving distribution for AA4160');
  console.log('Root Cause: Multiple buyer records not consolidated by email');
  console.log('Expected After Fix: Buyer should be excluded (no common areas)\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const testEmail = 'kouten0909@icloud.com';
  const testProperty = 'AA4160';

  // 1. Check buyer records
  console.log('1. Checking buyer records for kouten0909@icloud.com...');
  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('buyer_number, email, desired_area, latest_status, distribution_type, desired_property_type')
    .ilike('email', testEmail);

  if (buyersError) {
    console.error('Error fetching buyers:', buyersError);
    return;
  }

  console.log(`Found ${buyers.length} buyer records:\n`);
  
  const allAreas = new Set<string>();
  buyers.forEach((buyer, index) => {
    console.log(`Record ${index + 1}:`);
    console.log(`  Buyer number: ${buyer.buyer_number}`);
    console.log(`  Email: ${buyer.email}`);
    console.log(`  Desired area: ${buyer.desired_area || 'none'}`);
    console.log(`  Status: ${buyer.latest_status}`);
    console.log(`  Distribution type: ${buyer.distribution_type}`);
    console.log(`  Property type: ${buyer.desired_property_type || 'none'}`);
    console.log('');
    
    // Collect all areas
    if (buyer.desired_area) {
      buyer.desired_area.split('').forEach((area: string) => {
        if (area.trim()) allAreas.add(area);
      });
    }
  });

  const consolidatedAreas = Array.from(allAreas).join('');
  console.log(`Consolidated desired areas: ${consolidatedAreas}`);
  console.log('');

  // 2. Check property AA4160
  console.log('2. Checking property AA4160...');
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas, price, property_type')
    .eq('property_number', testProperty)
    .single();

  if (propertyError) {
    console.error('Error fetching property:', propertyError);
    return;
  }

  console.log(`Property: ${property.property_number}`);
  console.log(`Address: ${property.address}`);
  console.log(`Distribution areas: ${property.distribution_areas}`);
  console.log(`Property type: ${property.property_type || 'not set'}`);
  console.log(`Price: ${property.price ? `¥${property.price.toLocaleString()}` : 'not set'}`);
  console.log('');

  // 3. Check for common areas
  console.log('3. Checking for common areas...');
  const propertyAreas = (property.distribution_areas || '').split('');
  const buyerAreas = consolidatedAreas.split('');
  
  const commonAreas = propertyAreas.filter(area => buyerAreas.includes(area));
  
  console.log(`Property areas: ${propertyAreas.join('')}`);
  console.log(`Buyer areas: ${buyerAreas.join('')}`);
  console.log(`Common areas: ${commonAreas.length > 0 ? commonAreas.join('') : 'NONE'}`);
  console.log(`Expected match: NO (no common areas)`);
  console.log('');

  // 4. Run distribution calculation
  console.log('4. Running distribution calculation...');
  const service = new EnhancedBuyerDistributionService();
  
  try {
    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber: testProperty
    });

    console.log('\n=== Distribution Results ===');
    console.log(`Total buyer records: ${result.totalBuyers}`);
    console.log(`Qualified buyers: ${result.count}`);
    console.log(`Unique emails: ${result.emails.length}`);
    console.log('');

    // 5. Check if buyer is in the results
    const isIncluded = result.emails.some(email => 
      email.toLowerCase() === testEmail.toLowerCase()
    );

    console.log('=== Bug Fix Verification ===');
    console.log(`${testEmail} included in distribution: ${isIncluded}`);
    console.log(`Expected: false (no common areas)`);
    console.log('');
    
    if (isIncluded) {
      console.log('❌ TEST FAILED - Buyer is still incorrectly included');
      console.log('The email consolidation fix did not resolve the issue');
      
      // Show why buyer was included
      const buyerDetails = result.filteredBuyers.find(b => 
        b.email.toLowerCase() === testEmail.toLowerCase()
      );
      
      if (buyerDetails) {
        console.log('\nBuyer details:');
        console.log(`  Consolidated areas: ${buyerDetails.desired_area}`);
        console.log(`  Filter results:`);
        console.log(`    - Geography: ${buyerDetails.filterResults.geography ? 'PASS' : 'FAIL'}`);
        console.log(`    - Distribution: ${buyerDetails.filterResults.distribution ? 'PASS' : 'FAIL'}`);
        console.log(`    - Status: ${buyerDetails.filterResults.status ? 'PASS' : 'FAIL'}`);
        console.log(`    - Price Range: ${buyerDetails.filterResults.priceRange ? 'PASS' : 'FAIL'}`);
        
        if (buyerDetails.geographicMatch) {
          console.log(`  Geographic match: ${buyerDetails.geographicMatch.matchType}`);
          if (buyerDetails.geographicMatch.matchedAreas) {
            console.log(`  Matched areas: ${buyerDetails.geographicMatch.matchedAreas.join('')}`);
          }
        }
      }
    } else {
      console.log('✅ TEST PASSED - Buyer is correctly excluded');
      console.log('The email consolidation fix successfully resolved the issue');
    }
    
    console.log('');
    console.log('=== Summary ===');
    console.log(`Original bug: Buyer received distribution for AA4160 incorrectly`);
    console.log(`Root cause: Multiple buyer records not consolidated`);
    console.log(`Fix: Email-based consolidation implemented`);
    console.log(`Result: ${isIncluded ? 'BUG STILL EXISTS ❌' : 'BUG FIXED ✅'}`);

  } catch (error) {
    console.error('Error running distribution:', error);
  }
}

testAA4160Buyer2064Fixed().catch(console.error);
