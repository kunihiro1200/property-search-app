// Test: Email consolidation with different areas
// Tests that when multiple buyer records have the same email but different desired_area values,
// the system consolidates them and merges all areas

import { createClient } from '@supabase/supabase-js';
import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testEmailConsolidationDifferentAreas() {
  console.log('=== Test: Email Consolidation with Different Areas ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Find an email with multiple records that have different areas
  console.log('1. Finding test case with different areas...');
  
  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('buyer_number, email, desired_area, latest_status, distribution_type')
    .not('email', 'is', null)
    .neq('email', '')
    .not('desired_area', 'is', null)
    .neq('desired_area', '')
    .order('email');

  if (buyersError) {
    console.error('Error fetching buyers:', buyersError);
    return;
  }

  // Group by email and find one with different areas
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
    const areas = records.map(r => r.desired_area);
    const uniqueAreas = new Set(areas);
    return uniqueAreas.size > 1;
  });

  if (!testCase) {
    console.log('No test case found with different areas');
    console.log('Creating synthetic test scenario...\n');
    
    // Use a known email and describe what should happen
    console.log('Synthetic Test Scenario:');
    console.log('Email: test@example.com');
    console.log('Record 1: desired_area = "①②③"');
    console.log('Record 2: desired_area = "④⑤⑥"');
    console.log('Expected consolidated area: "①②③④⑤⑥"');
    console.log('');
    console.log('If property has distribution_areas = "⑤", buyer should match');
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
    console.log(`     Desired area: ${record.desired_area}`);
    console.log(`     Status: ${record.latest_status}`);
    console.log(`     Distribution type: ${record.distribution_type}`);
  });
  console.log('');

  // Calculate expected consolidated areas
  const allAreas = new Set<string>();
  testRecords.forEach(record => {
    const areas = (record.desired_area || '').split('');
    areas.forEach(area => {
      if (area.trim()) allAreas.add(area);
    });
  });
  
  const expectedConsolidatedAreas = Array.from(allAreas).join('');
  console.log(`Expected consolidated areas: ${expectedConsolidatedAreas}`);
  console.log('');

  // Find a property that matches one of the areas
  const testArea = Array.from(allAreas)[0];
  console.log(`2. Finding property with area "${testArea}"...`);
  
  const { data: properties, error: propError } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
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

    console.log('=== Test Result ===');
    console.log(`${testEmail} included in distribution: ${isIncluded}`);
    console.log(`Expected: true (has common area "${testArea}")`);
    console.log(`Test ${isIncluded ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('');

    // Show consolidated buyer details
    const buyerDetails = result.filteredBuyers.find(b => 
      b.email.toLowerCase() === testEmail.toLowerCase()
    );

    if (buyerDetails) {
      console.log('=== Consolidated Buyer Details ===');
      console.log(`Buyer numbers: ${buyerDetails.buyer_number}`);
      console.log(`Email: ${buyerDetails.email}`);
      console.log(`Consolidated desired area: ${buyerDetails.desired_area}`);
      console.log(`Expected: ${expectedConsolidatedAreas}`);
      console.log(`Areas match: ${buyerDetails.desired_area === expectedConsolidatedAreas ? 'YES ✅' : 'NO ❌'}`);
      console.log('');
      
      if (buyerDetails.geographicMatch) {
        console.log(`Geographic match type: ${buyerDetails.geographicMatch.matchType}`);
        if (buyerDetails.geographicMatch.matchedAreas) {
          console.log(`Matched areas: ${buyerDetails.geographicMatch.matchedAreas.join('')}`);
        }
      }
    } else {
      console.log('Buyer not found in filtered results');
      console.log('This may indicate the buyer was filtered out by other criteria');
    }

  } catch (error) {
    console.error('Error running distribution:', error);
  }
}

testEmailConsolidationDifferentAreas().catch(console.error);
