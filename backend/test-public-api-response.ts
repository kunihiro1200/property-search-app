/**
 * Test public properties API response format
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPublicApiResponse() {
  try {
    console.log('Testing public properties API response...\n');
    
    // Get public properties (atbb_status = '専任・公開中')
    const { data, error, count } = await supabase
      .from('property_listings')
      .select('id, property_number, property_type, address, price, land_area, building_area, construction_year_month, image_url, storage_location, distribution_areas, atbb_status, created_at', { count: 'exact' })
      .eq('atbb_status', '専任・公開中')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`Found ${count} public properties (atbb_status = '専任・公開中')\n`);
    
    if (!data || data.length === 0) {
      console.log('No public properties found!');
      console.log('\nChecking all atbb_status values...');
      
      const { data: allStatuses } = await supabase
        .from('property_listings')
        .select('atbb_status')
        .not('atbb_status', 'is', null)
        .limit(100);
      
      const statusCounts: Record<string, number> = {};
      allStatuses?.forEach((row: any) => {
        const status = row.atbb_status || 'NULL';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('\nStatus distribution (first 100 properties):');
      Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          console.log(`  ${status}: ${count}`);
        });
      
      return;
    }
    
    console.log('Sample properties:');
    data.forEach((prop: any, index: number) => {
      console.log(`\n${index + 1}. ${prop.property_number}:`);
      console.log(`   address: ${prop.address}`);
      console.log(`   price: ${prop.price}`);
      console.log(`   property_type: ${prop.property_type}`);
      console.log(`   image_url: ${prop.image_url ? 'YES' : 'NO'}`);
      console.log(`   storage_location: ${prop.storage_location ? 'YES' : 'NO'}`);
      console.log(`   atbb_status: ${prop.atbb_status}`);
    });
    
    // Count properties with images
    const withImages = data.filter((p: any) => p.image_url).length;
    console.log(`\n=== Image Statistics ===`);
    console.log(`Properties with image_url: ${withImages}/${data.length} (${((withImages/data.length)*100).toFixed(1)}%)`);
    
    // Simulate API response format
    console.log('\n=== Simulated API Response ===');
    const propertiesWithImages = data.map((property: any) => {
      const images = property.image_url ? [property.image_url] : [];
      return { ...property, images };
    });
    
    console.log(JSON.stringify({
      properties: propertiesWithImages.slice(0, 2),
      total: count,
      limit: 20,
      offset: 0
    }, null, 2));
    
  } catch (error: any) {
    console.error('Test failed:', error.message);
  }
}

testPublicApiResponse();
