import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking property_listings table schema...\n');

  // 1. CC105のデータを取得（全カラム）
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'CC105')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 CC105 data (all columns):');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n🔑 Available keys:');
  Object.keys(data).forEach(key => {
    console.log(`  - ${key}: ${typeof data[key]} = ${data[key]}`);
  });

  console.log('\n💰 Price-related fields:');
  const priceFields = Object.keys(data).filter(key => 
    key.toLowerCase().includes('price') || 
    key.toLowerCase().includes('sales') ||
    key.toLowerCase().includes('listing')
  );
  priceFields.forEach(key => {
    console.log(`  - ${key}: ${data[key]}`);
  });

  console.log('\n✨ Check completed!');
}

checkSchema().catch(console.error);
