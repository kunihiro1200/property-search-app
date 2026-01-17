import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAA12903Status() {
  console.log('=== AA12903のステータスを更新 ===\n');

  // AA12903を検索
  const { data: sellers, error: searchError } = await supabase
    .from('sellers')
    .select('id, seller_number, status')
    .eq('seller_number', 'AA12903');

  if (searchError || !sellers || sellers.length === 0) {
    console.error('❌ AA12903が見つかりません:', searchError);
    return;
  }

  const seller = sellers[0];
  console.log('現在のステータス:', seller.status);
  console.log('');

  // ステータスを「専任媒介」に更新
  const { error: updateError } = await supabase
    .from('sellers')
    .update({ status: '専任媒介' })
    .eq('id', seller.id)
    .select();

  if (updateError) {
    console.error('❌ 更新エラー:', updateError);
    return;
  }

  console.log('✅ ステータスを更新しました');
  console.log('新しいステータス: 専任媒介');
}

updateAA12903Status()
  .then(() => {
    console.log('\n✅ 完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
