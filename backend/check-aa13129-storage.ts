import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', 'AA13129')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('AA13129 storage_location:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\nType:', typeof data?.storage_location);
  console.log('Value:', data?.storage_location);
}

main();
