/**
 * Check image data in property_listings table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkImageData() {
  try {
    console.log('Checking image data in property_listings...\n');
    
    // Get sample properties with their image data
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_location, image_url')
      .limit(10);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Sample properties:');
    properties?.forEach((prop: any) => {
      console.log(`\n${prop.property_number}:`);
      console.log(`  storage_location: ${prop.storage_location || 'NULL'}`);
      console.log(`  image_url: ${prop.image_url || 'NULL'}`);
    });
    
    // Count properties by image data status
    const { data: stats, error: statsError } = await supabase
      .from('property_listings')
      .select('storage_location, image_url');
    
    if (statsError) {
      console.error('Stats error:', statsError);
      return;
    }
    
    const withStorage = stats?.filter((p: any) => p.storage_location).length || 0;
    const withImageUrl = stats?.filter((p: any) => p.image_url).length || 0;
    const total = stats?.length || 0;
    
    console.log('\n=== Statistics ===');
    console.log(`Total properties: ${total}`);
    console.log(`With storage_location: ${withStorage} (${((withStorage/total)*100).toFixed(1)}%)`);
    console.log(`With image_url: ${withImageUrl} (${((withImageUrl/total)*100).toFixed(1)}%)`);
    console.log(`Without storage_location: ${total - withStorage}`);
    
  } catch (error: any) {
    console.error('Check failed:', error.message);
  }
}

checkImageData();
