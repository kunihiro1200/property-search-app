/**
 * AA13312のSellerServiceレスポンスを確認
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

async function test() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  // まずseller_numberからUUIDを取得
  const { data: sellerData } = await supabase
    .from('sellers')
    .select('id, seller_number, next_call_date')
    .eq('seller_number', 'AA13312')
    .single();
  
  console.log('=== AA13312 DB直接確認 ===\n');
  console.log('id:', sellerData?.id);
  console.log('seller_number:', sellerData?.seller_number);
  console.log('next_call_date:', sellerData?.next_call_date);
}

test().catch(console.error);
