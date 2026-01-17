import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTable() {
  console.log('Checking beppu_area_mapping table...\n');
  
  // Check if table exists
  const { data, error } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('❌ Table does not exist or is not accessible');
    console.error('Error:', error.message);
    console.log('\nPlease create the table by running this SQL in Supabase SQL Editor:');
    console.log('------------------------------------------------------');
    console.log(`
CREATE TABLE IF NOT EXISTS beppu_area_mapping (
  id SERIAL PRIMARY KEY,
  school_district TEXT NOT NULL,
  region_name TEXT NOT NULL,
  distribution_areas TEXT NOT NULL,
  other_region TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beppu_region_name ON beppu_area_mapping(region_name);
CREATE INDEX IF NOT EXISTS idx_beppu_school_district ON beppu_area_mapping(school_district);
    `);
    console.log('------------------------------------------------------');
    return false;
  }
  
  console.log('✓ Table exists and is accessible');
  
  // Get row count
  const { count, error: countError } = await supabase
    .from('beppu_area_mapping')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error counting rows:', countError.message);
  } else {
    console.log(`✓ Current row count: ${count}`);
  }
  
  // Show sample data if exists
  if (data && data.length > 0) {
    console.log('\nSample data:');
    data.forEach((row: any) => {
      console.log(`  ${row.school_district} - ${row.region_name} → ${row.distribution_areas}`);
    });
  } else {
    console.log('\n⚠ Table is empty');
  }
  
  return true;
}

verifyTable().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
