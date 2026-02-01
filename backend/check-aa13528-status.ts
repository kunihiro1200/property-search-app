/**
 * AA13528の状態を確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('=== AA13528の状態確認 ===\n');
  
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year, status, current_status, next_call_date')
    .eq('seller_number', 'AA13528')
    .single();
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('AA13528のデータベース:');
  console.log('  inquiry_date:', data.inquiry_date);
  console.log('  inquiry_year:', data.inquiry_year);
  console.log('  status (状況当社):', data.status);
  console.log('  current_status (状況売主):', data.current_status);
  console.log('  next_call_date:', data.next_call_date);
}

check().catch(console.error);
