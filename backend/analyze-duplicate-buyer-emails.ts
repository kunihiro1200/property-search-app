// Analyze duplicate buyer emails
// Find all emails that have multiple buyer records
// This helps identify test cases for email consolidation

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function analyzeDuplicateBuyerEmails() {
  console.log('=== Analyzing Duplicate Buyer Emails ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Get all buyers with emails
  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, email, desired_area, latest_status, distribution_type, desired_property_type, price_range_house, price_range_apartment, price_range_land')
    .not('email', 'is', null)
    .neq('email', '')
    .order('email');

  if (error) {
    console.error('Error fetching buyers:', error);
    return;
  }

  console.log(`Total buyers with email: ${buyers.length}\n`);

  // Group by email (case-insensitive)
  const emailGroups = new Map<string, any[]>();
  
  buyers.forEach(buyer => {
    const email = buyer.email.toLowerCase().trim();
    if (!emailGroups.has(email)) {
      emailGroups.set(email, []);
    }
    emailGroups.get(email)!.push(buyer);
  });

  // Find duplicates
  const duplicates = Array.from(emailGroups.entries())
    .filter(([_, records]) => records.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`Emails with multiple records: ${duplicates.length}\n`);

  // Analyze duplicates
  console.log('=== Top 10 Duplicate Emails ===\n');
  
  duplicates.slice(0, 10).forEach(([email, records], index) => {
    console.log(`${index + 1}. ${email} (${records.length} records)`);
    
    // Check if areas are the same or different
    const areas = records.map(r => r.desired_area || '');
    const uniqueAreas = new Set(areas);
    const sameAreas = uniqueAreas.size === 1;
    
    // Check if statuses are the same or different
    const statuses = records.map(r => r.latest_status || '');
    const uniqueStatuses = new Set(statuses);
    const sameStatuses = uniqueStatuses.size === 1;
    
    // Check if property types are the same or different
    const propertyTypes = records.map(r => r.desired_property_type || '');
    const uniquePropertyTypes = new Set(propertyTypes);
    const samePropertyTypes = uniquePropertyTypes.size === 1;
    
    console.log(`   Areas: ${sameAreas ? 'SAME' : 'DIFFERENT'}`);
    console.log(`   Statuses: ${sameStatuses ? 'SAME' : 'DIFFERENT'}`);
    console.log(`   Property Types: ${samePropertyTypes ? 'SAME' : 'DIFFERENT'}`);
    
    records.forEach(record => {
      console.log(`   - Buyer ${record.buyer_number}:`);
      console.log(`     Desired area: ${record.desired_area || 'none'}`);
      console.log(`     Status: ${record.latest_status || 'none'}`);
      console.log(`     Distribution type: ${record.distribution_type || 'none'}`);
      console.log(`     Property type: ${record.desired_property_type || 'none'}`);
    });
    console.log('');
  });

  // Statistics
  console.log('=== Statistics ===');
  
  const sameAreasCount = duplicates.filter(([_, records]) => {
    const areas = records.map(r => r.desired_area || '');
    return new Set(areas).size === 1;
  }).length;
  
  const differentAreasCount = duplicates.length - sameAreasCount;
  
  const sameStatusCount = duplicates.filter(([_, records]) => {
    const statuses = records.map(r => r.latest_status || '');
    return new Set(statuses).size === 1;
  }).length;
  
  const differentStatusCount = duplicates.length - sameStatusCount;
  
  console.log(`Emails with same areas: ${sameAreasCount}`);
  console.log(`Emails with different areas: ${differentAreasCount}`);
  console.log(`Emails with same status: ${sameStatusCount}`);
  console.log(`Emails with different status: ${differentStatusCount}`);
  console.log('');

  // Find good test cases
  console.log('=== Recommended Test Cases ===\n');
  
  // Test case 1: Same areas
  const sameAreasCase = duplicates.find(([_, records]) => {
    const areas = records.map(r => r.desired_area || '');
    return new Set(areas).size === 1 && areas[0] !== '';
  });
  
  if (sameAreasCase) {
    console.log(`1. Same areas test case: ${sameAreasCase[0]}`);
    console.log(`   Records: ${sameAreasCase[1].length}`);
    console.log(`   Buyer numbers: ${sameAreasCase[1].map(r => r.buyer_number).join(', ')}`);
  }
  
  // Test case 2: Different areas
  const differentAreasCase = duplicates.find(([_, records]) => {
    const areas = records.map(r => r.desired_area || '').filter(a => a !== '');
    return new Set(areas).size > 1;
  });
  
  if (differentAreasCase) {
    console.log(`\n2. Different areas test case: ${differentAreasCase[0]}`);
    console.log(`   Records: ${differentAreasCase[1].length}`);
    console.log(`   Buyer numbers: ${differentAreasCase[1].map(r => r.buyer_number).join(', ')}`);
    console.log(`   Areas: ${differentAreasCase[1].map(r => r.desired_area || 'none').join(' | ')}`);
  }
  
  // Test case 3: Different statuses
  const differentStatusCase = duplicates.find(([_, records]) => {
    const statuses = records.map(r => r.latest_status || '');
    const uniqueStatuses = new Set(statuses);
    return uniqueStatuses.size > 1 && (statuses.includes('C') || statuses.includes('D'));
  });
  
  if (differentStatusCase) {
    console.log(`\n3. Different status test case: ${differentStatusCase[0]}`);
    console.log(`   Records: ${differentStatusCase[1].length}`);
    console.log(`   Buyer numbers: ${differentStatusCase[1].map(r => r.buyer_number).join(', ')}`);
    console.log(`   Statuses: ${differentStatusCase[1].map(r => r.latest_status || 'none').join(' | ')}`);
  }
}

analyzeDuplicateBuyerEmails()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
