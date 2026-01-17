import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyColumnRemoval() {
  console.log('Checking if hidden_images column exists...\n');

  try {
    // Check column existence via information_schema
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'property_listings')
      .eq('column_name', 'hidden_images');

    if (error) {
      console.error('Error checking column:', error);
      return;
    }

    if (!columns || columns.length === 0) {
      console.log('✅ SUCCESS: hidden_images column does not exist');
      console.log('The column has been successfully removed.');
    } else {
      console.log('❌ WARNING: hidden_images column still exists:');
      console.log(columns);
      console.log('\nPlease run the removal SQL script in Supabase Dashboard.');
    }

    // Also check if we can query the table
    console.log('\nTesting property_listings table access...');
    const { data: testData, error: testError } = await supabase
      .from('property_listings')
      .select('id, property_number')
      .limit(1);

    if (testError) {
      console.error('Error accessing property_listings:', testError);
    } else {
      console.log('✅ property_listings table is accessible');
      console.log('Sample data:', testData);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

verifyColumnRemoval();
