import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function resyncAA13154() {
  console.log('🔄 Re-syncing AA13154 storage_location...\n');

  // Get seller data
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('site_url, site, seller_number')
    .eq('seller_number', 'AA13154')
    .single();

  if (sellerError || !seller) {
    console.log('❌ Failed to fetch seller data:', sellerError?.message);
    return;
  }

  console.log('📋 Seller Data:');
  console.log(`  site_url: ${seller.site_url || 'NULL'}`);
  console.log(`  site: ${seller.site || 'NULL'}`);
  
  const storageLocation = seller.site_url || seller.site;
  console.log(`  → storage_location will be: ${storageLocation || 'NULL'}\n`);

  // Update property_listing
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({ 
      storage_location: storageLocation,
      updated_at: new Date().toISOString()
    })
    .eq('property_number', 'AA13154');

  if (updateError) {
    console.log('❌ Failed to update property_listing:', updateError.message);
    return;
  }

  console.log('✅ Update completed successfully!\n');
  console.log('🔍 Running verification...\n');
  
  // Run verification
  const { execSync } = require('child_process');
  try {
    execSync('npx ts-node verify-storage-location-fix.ts', { stdio: 'inherit' });
  } catch (error) {
    console.error('Verification script failed:', error);
  }
}

resyncAA13154().catch(console.error);
