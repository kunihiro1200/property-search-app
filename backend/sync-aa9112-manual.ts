import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sync() {
  // AA9112の物件情報を更新
  const { data, error } = await supabase
    .from('sellers')
    .update({
      property_address: '大分市高城本町3-11サンパティー高城 1102',
      property_type: 'マ'
    })
    .eq('seller_number', 'AA9112')
    .select();
  
  if (error) {
    console.log('エラー:', error.message);
  } else {
    console.log('更新成功:', data);
  }
}

sync();
