import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Checking hidden_images data...\n');
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('id, property_number, hidden_images')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample data:');
    data?.forEach((row: any) => {
      console.log(`\nProperty: ${row.property_number}`);
      console.log(`ID: ${row.id}`);
      console.log(`hidden_images type: ${typeof row.hidden_images}`);
      console.log(`hidden_images value: ${JSON.stringify(row.hidden_images)}`);
      console.log(`hidden_images is null: ${row.hidden_images === null}`);
      console.log(`hidden_images is array: ${Array.isArray(row.hidden_images)}`);
    });
  }
}

checkData().catch(console.error);
