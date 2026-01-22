import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkPropertyTypes() {
  console.log('Checking property types in database...\n');
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, property_type')
    .eq('atbb_status', '専任・公開中')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Sample property types from database:');
  data.forEach(p => {
    console.log(`  ${p.property_number}: '${p.property_type}'`);
  });
  
  // Count by type
  const { data: allData } = await supabase
    .from('property_listings')
    .select('property_type')
    .eq('atbb_status', '専任・公開中');
  
  if (allData) {
    const counts: Record<string, number> = {};
    allData.forEach(p => {
      const type = p.property_type || 'null';
      counts[type] = (counts[type] || 0) + 1;
    });
    
    console.log('\nProperty type distribution:');
    Object.entries(counts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }
}

checkPropertyTypes();
