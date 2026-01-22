import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test addresses
const testAddresses = [
  '大分県別府市南立石一区1-1',
  '大分県別府市田の湯町1-1',
  '大分県別府市北石垣1-1',
  '大分県別府市朝見1-1',
  '大分県別府市東山1-1',
  '大分県別府市鶴見1-1',
  '大分県別府市野口原1-1',
  '大分県別府市駅前町1-1',
  '大分県別府市その他地区1-1', // Should fallback to ㊶
];

async function testAreaMapping() {
  console.log('=== Testing Beppu Area Mapping ===\n');

  for (const address of testAddresses) {
    console.log(`Testing: ${address}`);
    
    // Extract region name (simplified version)
    const regionMatch = address.match(/別府市(.+?)(?:[0-9０-９]|$)/);
    if (!regionMatch) {
      console.log('  → Could not extract region\n');
      continue;
    }
    
    const fullRegion = regionMatch[1];
    console.log(`  Extracted region: ${fullRegion}`);
    
    // Try to find mapping
    const { data, error } = await supabase
      .from('beppu_area_mapping')
      .select('*')
      .ilike('region_name', `%${fullRegion}%`)
      .limit(1)
      .single();
    
    if (error || !data) {
      console.log(`  → No mapping found, fallback to ㊶ (Beppu City全体)`);
    } else {
      console.log(`  → Mapped to: ${data.distribution_areas} (${data.school_district})`);
    }
    console.log('');
  }
}

testAreaMapping().catch(console.error);
