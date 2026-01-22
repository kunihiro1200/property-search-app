import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC5AthomeDataColumn() {
  console.log('=== CC5 athome_data Column Check ===\n');
  
  const { data, error } = await supabase
    .from('property_details')
    .select('property_number, athome_data')
    .eq('property_number', 'CC5')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('property_number:', data.property_number);
  console.log('athome_data type:', typeof data.athome_data);
  console.log('athome_data:', JSON.stringify(data.athome_data, null, 2));
  
  if (data.athome_data) {
    console.log('\n=== athome_data contents ===');
    console.log('panoramaUrl:', data.athome_data.panoramaUrl);
    console.log('Keys:', Object.keys(data.athome_data));
  } else {
    console.log('\n❌ athome_data is null or undefined');
  }
}

checkCC5AthomeDataColumn().catch(console.error);
