// Test: Email consolidation with different statuses
// Tests that when multiple buyer records have the same email but different statuses,
// the system uses the most permissive status (C over D)

import { createClient } from '@supabase/supabase-js';
import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testEmailConsolidationStatusPriority() {
  console.log('=== Test: Email Consolidation with Status Priority ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Find an email with multiple records that have different statuses
  console.log('1. Finding test case with different statuses...');
  
  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('buyer_number, email, desired_area, latest_status, distribution_type')
    .not('email', 'is', null)
    .neq('email', '')
    .order('email');

  if (buyersError) {
    console.error('Error fetching buyers:', buyersError);
    return;
  }

  // Group by email and find one with different statuses (C and D)
  const emailGroups = new Map<string, any[]>();
  buyers.forEach(buyer => {
    const email = buyer.email.toLowerCase().trim();
    if (!emailGroups.has(email)) {
      emailGroups.set(email, []);
    }
    emailGroups.get(email)!.push(buyer);
  });

  const testCase = Array.from(emailGroups.entries()).find(([_, records]) => {
    if (records.length < 2) return false;
    const statuses = records.map(r => r.latest_status || '');
    const hasC = statuses.some(s => s.includes('C'));
    const hasD = statuses.some(s => s.includes('D'));
    return hasC && hasD;
  });

  if (!testCase) {
    console.log('No test case found with C and D statuses');
    console.log('Creating synthetic test scenario...\n');
    
    console.log('Synthetic Test Scenario:');
    console.log('Email: test@example.com');
    console.log('Record 1: status = "C" (active)');
    console.log('Record 2: status = "D" (inactive)');
    console.log('Expected consolidated status: "C" (most permissive)');
    console.log('');
    console.log('Buyer should be included in distribution (C is active)');
    console.log('Test: SKIPPED (no real data available)');
    return;
  }

  const [testEmail, testRecords] = testCase;
  
  console.log(`Found test case: ${testEmail}`);
  console.log(`Number of records: ${testRecords.length}`);
  console.log('');

  // Show individual records
  console.log('Individual buyer records:');
  testRecords.forEach((record, index) => {
    console.log(`  ${index + 1}. Buyer ${record.buyer_number}:`);
    console.log(`     Status: ${record.latest_status}`);
    console.log(`     Desired area: ${record.desired_area || 'none'}`);
    console.log(`     Distribution type: ${record.distribution_type}`);
  });
  console.log('');

  // Determine expected status (most permissive)
  const hasC = testRecords.some(r => (r.latest_status || '').includes('C'));
  const expectedStatus = hasC ? 'C' : 'D';
  
  console.log(`Expected consolidated status: ${expectedStatus} (most permissive)`);
  console.log(`Should be included: ${expectedStatus === 'C' ? 'YES' : 'NO'}`);
  console.log('');

  // Find a property that matches the buyer's areas
  const buyerAreas = testRecords
    .map(r => r.desired_area || '')
    .filter(a => a !== '')
    .join('');
  
  if (!buyerAreas) {
    console.log('No desired areas found for test buyer');
    console.log('Test: SKIPPED (no areas to match)');
    return;
  }

  const testArea = buyerAreas[0];
  console.log(`2. Finding property with area "${testArea}"...`);
  
  const { data: properties, error: propError } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas, price')
    .not('distribution_areas', 'is', null)
    .limit(100);

  if (propError) {
    console.error('Error fetching properties:', propError);
    return;
  }

  const matchingProperty = properties.find(p => 
    p.distribution_areas && p.distribution_areas.includes(testArea)
  );

  if (!matchingProperty) {
    console.log(`No property found with area "${testArea}"`);
    console.log('Test: SKIPPED (no matching property)');
    return;
  }

  console.log(`Found property: ${matchingProperty.property_number}`);
  console.log(`Address: ${matchingProperty.address}`);
  console.log(`Distribution areas: ${matchingProperty.distribution_areas}`);
  console.log(`Price: ${matchingProperty.price ? `¥${matchingProperty.price.toLocaleString()}` : 'not set'}`);
  console.log('');

  // Run distribution calculation
  console.log('3. Running distribution calculation with email consolidation...');
  const service = new EnhancedBuyerDistributionService();
  
  try {
    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber: matchingProperty.property_number
    });

    console.log('\n=== Distribution Results ===');
    console.log(`Total buyer records: ${result.totalBuyers}`);
    console.log(`Qualified buyers: ${result.count}`);
    console.log(`Unique emails: ${result.emails.length}`);
    console.log('');

    // Check if test email is in the results
    const isIncluded = result.emails.some(email => 
      email.toLowerCase() === testEmail.toLowerCase()
    );

    const shouldBeIncluded = expectedStatus === 'C';
    
    console.log('=== Test Result ===');
    console.log(`${testEmail} included in distribution: ${isIncluded}`);
    console.log(`Expected: ${shouldBeIncluded} (status ${expectedStatus})`);
    console.log(`Test ${isIncluded === shouldBeIncluded ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('');

    // Show consolidated buyer details
    const buyerDetails = result.filteredBuyers.find(b => 
      b.email.toLowerCase() === testEmail.toLowerCase()
    );

    if (buyerDetails) {
      console.log('=== Consolidated Buyer Details ===');
      console.log(`Buyer numbers: ${buyerDetails.buyer_number}`);
      console.log(`Email: ${buyerDetails.email}`);
      console.log(`Consolidated status: ${buyerDetails.latest_status}`);
      console.log(`Expected status: ${expectedStatus}`);
      console.log(`Status correct: ${buyerDetails.latest_status === expectedStatus ? 'YES ✅' : 'NO ❌'}`);
      console.log('');
      console.log(`Filter results:`);
      console.log(`  - Geography: ${buyerDetails.filterResults.geography ? 'PASS' : 'FAIL'}`);
      console.log(`  - Distribution: ${buyerDetails.filterResults.distribution ? 'PASS' : 'FAIL'}`);
      console.log(`  - Status: ${buyerDetails.filterResults.status ? 'PASS' : 'FAIL'}`);
      console.log(`  - Price Range: ${buyerDetails.filterResults.priceRange ? 'PASS' : 'FAIL'}`);
    } else if (shouldBeIncluded) {
      console.log('Buyer not found in filtered results (unexpected)');
      console.log('This indicates a problem with status consolidation or filtering');
    } else {
      console.log('Buyer correctly excluded (status D)');
    }

  } catch (error) {
    console.error('Error running distribution:', error);
  }
}

testEmailConsolidationStatusPriority().catch(console.error);
