import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('🔍 Checking sellers table structure...\n');

  // Get one seller to see all columns
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📋 All columns for AA12923:');
  console.log(JSON.stringify(seller, null, 2));
}

checkColumns().catch(console.error);
