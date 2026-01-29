import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkCC105InDB() {
  console.log('🔍 Checking CC105 in database...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'CC105')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data) {
    console.log('❌ CC105 not found in database');
    return;
  }

  console.log('✅ Found CC105 in database\n');
  console.log('📋 CC105 data:');
  
  // 重要なフィールドを表示
  const importantFields = [
    'property_number',
    'property_type',
    'sale_price',
    'buyer_name',
    'property_address',
    'atbb_status',
    'status',
    'storage_location',
    'spreadsheet_url',
  ];
  
  importantFields.forEach(field => {
    const value = data[field];
    console.log(`  ${field}: ${value !== null && value !== undefined ? value : '(空)'}`);
  });
  
  console.log('\n📋 All fields:');
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      console.log(`  ${key}: ${value}`);
    }
  });
}

checkCC105InDB().catch(console.error);
