import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testSearch() {
  console.log('Testing CC6 search...');
  
  // Test 1: ilike with CC6
  const { data: data1, error: error1 } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, address')
    .ilike('property_number', 'CC6');
  
  console.log('\n1. ilike CC6:', { count: data1?.length, data: data1, error: error1 });
  
  // Test 2: ilike with %CC6%
  const { data: data2, error: error2 } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, address')
    .ilike('property_number', '%CC6%');
  
  console.log('\n2. ilike %CC6%:', { count: data2?.length, data: data2, error: error2 });
  
  // Test 3: eq with CC6
  const { data: data3, error: error3 } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, address')
    .eq('property_number', 'CC6');
  
  console.log('\n3. eq CC6:', { count: data3?.length, data: data3, error: error3 });
  
  // Test 4: CC100
  const { data: data4, error: error4 } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, address')
    .ilike('property_number', 'CC100');
  
  console.log('\n4. ilike CC100:', { count: data4?.length, data: data4, error: error4 });
  
  // Test 5: All CC properties
  const { data: data5, error: error5 } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, address')
    .ilike('property_number', 'CC%')
    .limit(10);
  
  console.log('\n5. ilike CC%:', { count: data5?.length, data: data5?.map(p => p.property_number), error: error5 });
}

testSearch().catch(console.error);
