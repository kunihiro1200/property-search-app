/**
 * Test if images from Google Drive are accessible
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testImageAccess() {
  try {
    console.log('Testing image access from public properties...\n');
    
    // Get a few properties with storage locations
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .not('storage_location', 'is', null)
      .limit(5);
    
    if (error) {
      console.error('Error fetching properties:', error);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('No properties with storage_location found');
      return;
    }
    
    console.log(`Found ${properties.length} properties with storage locations\n`);
    
    for (const property of properties) {
      console.log(`\n--- ${property.property_number} ---`);
      console.log(`Storage Location: ${property.storage_location}`);
      
      if (!property.storage_location) {
        console.log('No storage location');
        continue;
      }
      
      // Extract folder ID from storage location URL
      const folderMatch = property.storage_location.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (!folderMatch) {
        console.log('✗ Could not extract folder ID from storage location');
        continue;
      }
      
      const folderId = folderMatch[1];
      console.log(`Folder ID: ${folderId}`);
      
      // Test if we can access the folder
      const testImageUrl = `https://drive.google.com/uc?export=view&id=${folderId}`;
      console.log(`Test URL: ${testImageUrl}`);
      
      try {
        const response = await fetch(testImageUrl, {
          method: 'HEAD',
          redirect: 'follow'
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 200) {
          console.log('✓ Storage location is accessible');
        } else {
          console.log('✗ Storage location is NOT accessible');
        }
        
      } catch (fetchError: any) {
        console.error(`✗ Fetch error: ${fetchError.message}`);
      }
    }
    
  } catch (error: any) {
    console.error('Test failed:', error.message);
  }
}

testImageAccess();
