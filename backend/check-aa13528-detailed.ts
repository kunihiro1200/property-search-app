/**
 * AA13528の詳細データ確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('=== AA13528の詳細データ確認 ===\n');
  
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13528')
    .single();
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('AA13528のデータ:');
  console.log('  seller_number:', data.seller_number);
  console.log('  current_status (状況売主):', data.current_status);
  console.log('  seller_situation:', data.seller_situation);
  console.log('  status (状況当社):', data.status);
  console.log('  inquiry_date:', data.inquiry_date);
  console.log('  inquiry_year:', data.inquiry_year);
  console.log('  next_call_date:', data.next_call_date);
  console.log('  unreachable_status:', data.unreachable_status);
  console.log('  pinrich_status:', data.pinrich_status);
}

check();
