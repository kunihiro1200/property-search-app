import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function updateThreeCallsValues() {
  console.log('🔄 Updating three_calls_confirmed values...');
  
  // 「済」→「3回架電OK」
  const { data: data1, error: error1 } = await supabase
    .from('buyers')
    .update({ three_calls_confirmed: '3回架電OK' })
    .eq('three_calls_confirmed', '済')
    .select('buyer_number');
  
  if (error1) {
    console.error('❌ Error updating 済:', error1);
  } else {
    console.log(`✅ Updated ${data1?.length || 0} records: 済 → 3回架電OK`);
  }
  
  // 「未」→「3回架電未」
  const { data: data2, error: error2 } = await supabase
    .from('buyers')
    .update({ three_calls_confirmed: '3回架電未' })
    .eq('three_calls_confirmed', '未')
    .select('buyer_number');
  
  if (error2) {
    console.error('❌ Error updating 未:', error2);
  } else {
    console.log(`✅ Updated ${data2?.length || 0} records: 未 → 3回架電未`);
  }
  
  // 確認
  const { data: counts, error: error3 } = await supabase
    .from('buyers')
    .select('three_calls_confirmed')
    .not('three_calls_confirmed', 'is', null);
  
  if (error3) {
    console.error('❌ Error fetching counts:', error3);
  } else {
    const summary = counts?.reduce((acc: any, row: any) => {
      acc[row.three_calls_confirmed] = (acc[row.three_calls_confirmed] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Current values:');
    console.log(summary);
  }
}

updateThreeCallsValues();
