// Check buyer table schema columns
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSchema() {
  console.log('=== Checking Buyer Table Schema ===\n');
  
  // Get a sample buyer to see actual columns
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching buyer:', error);
    return;
  }
  
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]).sort();
    console.log(`Total columns: ${columns.length}\n`);
    console.log('Columns:');
    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });
  } else {
    console.log('No buyers found in database');
  }
}

checkSchema();
