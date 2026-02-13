import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProperties() {
  const propertyNumbers = ['AA13407', 'AA13389'];
  
  console.log('Checking properties in database...\n');
  
  for (const propertyNumber of propertyNumbers) {
    const { data, error } = await supabase
      .from('property_listings')
      .select('property_number, address, sales_assignee, atbb_status, sidebar_status, created_at')
      .eq('property_number', propertyNumber)
      .single();
    
    if (error) {
      console.log(`❌ ${propertyNumber}: NOT FOUND`);
      console.log(`   Error: ${error.message}\n`);
    } else {
      console.log(`✓ ${propertyNumber}: FOUND`);
      console.log(`   Address: ${data.address || 'N/A'}`);
      console.log(`   Assignee: ${data.sales_assignee || 'N/A'}`);
      console.log(`   ATBB Status: ${data.atbb_status || 'N/A'}`);
      console.log(`   Sidebar Status: ${data.sidebar_status || 'N/A'}`);
      console.log(`   Created: ${data.created_at}\n`);
    }
  }
  
  // Count total properties
  const { count } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total properties in database: ${count}`);
}

checkProperties().catch(console.error);
