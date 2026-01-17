import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function verifyMigration() {
  console.log('🔍 Verifying migration 072...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check if site_display column exists
    console.log('1. Checking site_display column...');
    const { error: error1 } = await supabase
      .from('property_listings')
      .select('site_display')
      .limit(1);
    
    if (error1) {
      console.log('   ❌ site_display column NOT found');
      console.log('   Error:', error1.message);
    } else {
      console.log('   ✅ site_display column exists');
    }

    // Check if remarks column exists
    console.log('\n2. Checking remarks column...');
    const { error: error2 } = await supabase
      .from('property_listings')
      .select('remarks')
      .limit(1);
    
    if (error2) {
      console.log('   ❌ remarks column NOT found');
      console.log('   Error:', error2.message);
    } else {
      console.log('   ✅ remarks column exists');
    }

    // Check if property_inquiries table exists
    console.log('\n3. Checking property_inquiries table...');
    const { error: error3 } = await supabase
      .from('property_inquiries')
      .select('id')
      .limit(1);
    
    if (error3) {
      console.log('   ❌ property_inquiries table NOT found');
      console.log('   Error:', error3.message);
    } else {
      console.log('   ✅ property_inquiries table exists');
    }

    // Check for properties with site_display = 'サイト表示'
    console.log('\n4. Checking for public properties...');
    const { data: publicProps, error: error4 } = await supabase
      .from('property_listings')
      .select('property_number, site_display')
      .eq('site_display', 'サイト表示')
      .limit(5);
    
    if (error4) {
      console.log('   ⚠️  Could not query public properties');
      console.log('   Error:', error4.message);
    } else if (!publicProps || publicProps.length === 0) {
      console.log('   ⚠️  No properties with site_display = "サイト表示" found');
      console.log('   You may need to set some properties to public display');
    } else {
      console.log(`   ✅ Found ${publicProps.length} public properties:`);
      publicProps.forEach(p => {
        console.log(`      - ${p.property_number}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    
    if (!error1 && !error2 && !error3) {
      console.log('✅ Migration 072 is complete!');
      console.log('\nYou can now access the public property site at:');
      console.log('   http://localhost:5174/public/properties');
    } else {
      console.log('❌ Migration 072 is NOT complete');
      console.log('\nPlease run the SQL manually in Supabase SQL Editor.');
      console.log('See MIGRATION_072_MANUAL_GUIDE.md for instructions.');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    throw error;
  }
}

verifyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
