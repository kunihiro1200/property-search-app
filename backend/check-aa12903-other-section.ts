import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA12903Other() {
  try {
    const { data, error } = await supabase
      .from('sellers')
      .select('seller_number, site, exclusive_other_decision_factors, exclusive_other_decision_factor')
      .eq('seller_number', 'AA12903')
      .single();
    
    if (error) {
      console.error('エラー:', error);
      return;
    }
    
    console.log('AA12903 「他」セクションデータ:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n--- フィールド詳細 ---');
    console.log('site:', data.site || '(空)');
    console.log('exclusive_other_decision_factors (JSONB):', data.exclusive_other_decision_factors || '(空)');
    console.log('exclusive_other_decision_factor (TEXT):', data.exclusive_other_decision_factor || '(空)');
  } catch (err) {
    console.error('エラー:', err);
  }
}

checkAA12903Other();
