import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
  // APIと同じクエリを実行（500件、inquiry_date降順）
  const { data, error, count } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, status, next_call_date, phone_contact_person', { count: 'exact' })
    .is('deleted_at', null)
    .order('inquiry_date', { ascending: false })
    .range(0, 499);
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('=== 上位500件の売主 ===');
  console.log('取得件数:', data?.length);
  console.log('全件数:', count);
  
  // AA130を探す
  const aa130 = data?.find(s => s.seller_number === 'AA130');
  
  if (aa130) {
    const index = data?.findIndex(s => s.seller_number === 'AA130');
    console.log('');
    console.log('=== AA130 ===');
    console.log('見つかった位置:', index! + 1, '番目');
    console.log('inquiry_date:', aa130.inquiry_date);
    console.log('status:', aa130.status);
    console.log('next_call_date:', aa130.next_call_date);
    console.log('phone_contact_person:', aa130.phone_contact_person);
  } else {
    console.log('');
    console.log('❌ AA130は上位500件に含まれていません');
    
    // AA130のinquiry_dateを確認
    const { data: aa130Data } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date')
      .eq('seller_number', 'AA130')
      .single();
    
    if (aa130Data) {
      console.log('AA130のinquiry_date:', aa130Data.inquiry_date);
      
      // 500番目のinquiry_dateを確認
      const last = data?.[data.length - 1];
      console.log('500番目のinquiry_date:', last?.inquiry_date);
    }
  }
}

check();
