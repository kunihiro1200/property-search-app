import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
  // AA13314のデータを確認
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, next_call_date, status, inquiry_date')
    .eq('seller_number', 'AA13314')
    .single();
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('=== AA13314 データ ===');
  console.log('seller_number:', data.seller_number);
  console.log('next_call_date:', data.next_call_date);
  console.log('status:', data.status);
  console.log('inquiry_date:', data.inquiry_date);
  console.log('');
  
  // 次電日が2025年になっている売主を検索
  console.log('=== 次電日が2025年の売主（追客中）===');
  const { data: sellers2025, error: error2025 } = await supabase
    .from('sellers')
    .select('seller_number, next_call_date, status')
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .gte('next_call_date', '2025-01-01')
    .lt('next_call_date', '2026-01-01')
    .order('next_call_date', { ascending: false })
    .limit(20);
  
  if (error2025) {
    console.log('Error:', error2025.message);
    return;
  }
  
  console.log('件数:', sellers2025?.length);
  sellers2025?.forEach(s => {
    console.log(`  ${s.seller_number}: ${s.next_call_date}`);
  });
  
  // 次電日が2026年5月以降の売主を検索（本来は当日TELに含まれないはず）
  console.log('');
  console.log('=== 次電日が2026年2月以降の売主（追客中）===');
  const { data: sellersFuture, error: errorFuture } = await supabase
    .from('sellers')
    .select('seller_number, next_call_date, status')
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .gte('next_call_date', '2026-02-01')
    .order('next_call_date', { ascending: true })
    .limit(20);
  
  if (errorFuture) {
    console.log('Error:', errorFuture.message);
    return;
  }
  
  console.log('件数:', sellersFuture?.length);
  sellersFuture?.forEach(s => {
    console.log(`  ${s.seller_number}: ${s.next_call_date}`);
  });
}

check();
