/**
 * Sync storage_location from work_tasks.storage_url to property_listings.storage_location
 * This will fix the image display issue on the public property site
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncStorageLocations() {
  try {
    console.log('Starting storage_location sync...\n');
    
    // Get all property_listings with null storage_location
    const { data: properties, error: propertiesError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .is('storage_location', null);
    
    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('No properties need updating');
      return;
    }
    
    console.log(`Found ${properties.length} properties with null storage_location\n`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const property of properties) {
      try {
        // Get storage_url from work_tasks
        const { data: workTask, error: workTaskError } = await supabase
          .from('work_tasks')
          .select('storage_url')
          .eq('property_number', property.property_number)
          .single();
        
        if (workTaskError || !workTask || !workTask.storage_url) {
          console.log(`⊘ ${property.property_number}: No storage_url in work_tasks`);
          skipped++;
          continue;
        }
        
        // Update property_listings with storage_url
        const { error: updateError } = await supabase
          .from('property_listings')
          .update({ storage_location: workTask.storage_url })
          .eq('id', property.id);
        
        if (updateError) {
          console.error(`✗ ${property.property_number}: Update failed -`, updateError.message);
          errors++;
        } else {
          console.log(`✓ ${property.property_number}: Updated`);
          updated++;
        }
        
      } catch (error: any) {
        console.error(`✗ ${property.property_number}: Error -`, error.message);
        errors++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total properties: ${properties.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (no storage_url): ${skipped}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error: any) {
    console.error('Sync failed:', error.message);
  }
}

syncStorageLocations();
