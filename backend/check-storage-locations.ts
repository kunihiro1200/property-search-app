/**
 * Check how many public properties have storage_location set
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStorageLocations() {
  try {
    console.log('Checking storage_location field for public properties...\n');
    
    // Get all public properties
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, address, storage_location, atbb_status')
      .eq('atbb_status', '専任・公開中')
      .limit(20);
    
    if (error) {
      console.error('Error fetching properties:', error);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('No public properties found');
      return;
    }
    
    console.log(`Total public properties checked: ${properties.length}\n`);
    
    const withStorage = properties.filter(p => p.storage_location);
    const withoutStorage = properties.filter(p => !p.storage_location);
    
    console.log(`Properties WITH storage_location: ${withStorage.length}`);
    console.log(`Properties WITHOUT storage_location: ${withoutStorage.length}\n`);
    
    if (withStorage.length > 0) {
      console.log('Sample properties WITH storage_location:');
      withStorage.slice(0, 3).forEach(p => {
        console.log(`- ${p.property_number}: ${p.storage_location}`);
      });
      console.log('');
    }
    
    if (withoutStorage.length > 0) {
      console.log('Sample properties WITHOUT storage_location:');
      withoutStorage.slice(0, 5).forEach(p => {
        console.log(`- ${p.property_number}: ${p.address}`);
      });
      console.log('');
    }
    
    // Check if work_tasks table has storage_url for these properties
    console.log('Checking work_tasks table for storage_url...\n');
    
    const sampleProperty = withoutStorage[0];
    if (sampleProperty) {
      const { data: workTask, error: workTaskError } = await supabase
        .from('work_tasks')
        .select('property_number, storage_url')
        .eq('property_number', sampleProperty.property_number)
        .single();
      
      if (workTaskError) {
        console.log(`No work_task found for ${sampleProperty.property_number}`);
      } else {
        console.log(`Work task for ${sampleProperty.property_number}:`);
        console.log(`- storage_url: ${workTask.storage_url || 'null'}`);
      }
    }
    
  } catch (error: any) {
    console.error('Check failed:', error.message);
  }
}

checkStorageLocations();
