import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  console.log('🔍 Checking property_listings table schema...\n');

  // Get a sample property to see available columns
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 Available columns:');
  console.log(Object.keys(data).sort().join('\n'));
}

checkSchema();
