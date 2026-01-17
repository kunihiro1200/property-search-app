import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
  console.log('Checking if last_synced_at column exists in buyers table...\n');

  // Check column existence using information_schema
  const { data: columns, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'buyers')
    .eq('column_name', 'last_synced_at');

  if (error) {
    console.error('Error checking column:', error);
    return;
  }

  if (columns && columns.length > 0) {
    console.log('✅ Column exists:');
    console.log(columns);
  } else {
    console.log('❌ Column does NOT exist');
  }

  // Try to query the buyers table directly
  console.log('\nTrying to select last_synced_at from buyers table...');
  const { data, error: selectError } = await supabase
    .from('buyers')
    .select('id, last_synced_at')
    .limit(1);

  if (selectError) {
    console.error('❌ Error selecting column:', selectError.message);
  } else {
    console.log('✅ Successfully selected column');
    console.log('Sample data:', data);
  }
}

checkColumn().catch(console.error);
