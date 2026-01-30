import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13500ValuationMethod() {
  try {
    console.log('=== AA13500の査定方法を確認 ===');

    // データベースから取得
    const { data, error } = await supabase
      .from('sellers')
      .select('seller_number, valuation_method, mailing_status, mail_sent_date')
      .eq('seller_number', 'AA13500')
      .single();

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log('📊 データベースの値:');
    console.log('   売主番号:', data.seller_number);
    console.log('   査定方法:', data.valuation_method);
    console.log('   郵送ステータス:', data.mailing_status);
    console.log('   郵送日:', data.mail_sent_date);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkAA13500ValuationMethod();
