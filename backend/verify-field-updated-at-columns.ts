import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyColumns() {
  console.log('🔍 Verifying field_updated_at columns in buyers table...\n');
  
  try {
    // Get a sample buyer to check columns
    const { data, error } = await supabase
      .from('buyers')
      .select('buyer_number, inquiry_hearing_updated_at, desired_timing_updated_at, parking_spaces_updated_at, desired_price_range_updated_at')
      .limit(1);
    
    if (error) {
      console.error('❌ Error querying buyers table:', error.message);
      
      // Check if error is about missing columns
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('\n⚠️  Some columns are missing. Please run the migration:');
        console.log('   npx ts-node backend/run-migration-field-updated-at.ts');
        console.log('   OR execute the SQL manually in Supabase Studio:');
        console.log('   backend/supabase/migrations/20260211_add_field_updated_at_columns.sql');
      }
      
      process.exit(1);
    }
    
    console.log('✅ All field_updated_at columns exist in buyers table');
    console.log('\nColumns verified:');
    console.log('  - inquiry_hearing_updated_at');
    console.log('  - desired_timing_updated_at');
    console.log('  - parking_spaces_updated_at');
    console.log('  - desired_price_range_updated_at');
    
    if (data && data.length > 0) {
      console.log('\nSample data:');
      console.log(JSON.stringify(data[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyColumns();
