import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkKitanakaMapping() {
  console.log('=== Checking 北中 Mapping ===\n');

  const { data, error } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .eq('region_name', '北中');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No mapping found for 北中');
    return;
  }

  console.log(`Found ${data.length} mapping(s) for 北中:\n`);
  data.forEach((row, index) => {
    console.log(`Mapping ${index + 1}:`);
    console.log(`  School District: ${row.school_district}`);
    console.log(`  Region Name: ${row.region_name}`);
    console.log(`  Distribution Areas: ${row.distribution_areas}`);
    console.log(`  Other Region: ${row.other_region}`);
    console.log('');
  });
}

checkKitanakaMapping().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
