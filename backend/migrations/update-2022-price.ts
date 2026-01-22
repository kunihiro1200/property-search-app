import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateConstructionPrice() {
  console.log('🚀 Updating 2022 construction price...\n');

  try {
    // Update 2022 data
    const { data, error } = await supabase
      .from('construction_prices')
      .update({
        wood_price: 123100,
        updated_at: new Date().toISOString()
      })
      .eq('year', 2022)
      .select();

    if (error) {
      console.error('❌ Error updating:', error);
      process.exit(1);
    }

    console.log('✅ Successfully updated 2022 data:', data);
    console.log('\n📊 Updated values:');
    console.log('  Year: 2022');
    console.log('  Wood price: 123,100 yen/㎡');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

updateConstructionPrice();
