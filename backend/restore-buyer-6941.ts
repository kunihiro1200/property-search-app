import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function restoreBuyer6941() {
  console.log('=== 買主6941の復元 ===\n');

  // 1. 現在の状態を確認
  const { data: buyer, error: fetchError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6941')
    .single();

  if (fetchError) {
    console.error('エラー:', fetchError);
    return;
  }

  if (!buyer) {
    console.log('買主6941が見つかりません');
    return;
  }

  console.log('現在の状態:');
  console.log('  買主番号:', buyer.buyer_number);
  console.log('  氏名:', buyer.name);
  console.log('  削除日時:', buyer.deleted_at);

  if (!buyer.deleted_at) {
    console.log('\n✅ 買主6941は既に復元されています（deleted_at = NULL）');
    return;
  }

  // 2. deleted_atをNULLに設定
  console.log('\n🔄 deleted_atをNULLに設定中...');
  
  const { error: updateError } = await supabase
    .from('buyers')
    .update({ deleted_at: null })
    .eq('buyer_number', '6941');

  if (updateError) {
    console.error('❌ 更新エラー:', updateError);
    return;
  }

  console.log('✅ 買主6941を復元しました（deleted_at = NULL）');

  // 3. 復元後の状態を確認
  const { data: restoredBuyer, error: verifyError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6941')
    .single();

  if (verifyError) {
    console.error('検証エラー:', verifyError);
    return;
  }

  console.log('\n復元後の状態:');
  console.log('  買主番号:', restoredBuyer.buyer_number);
  console.log('  氏名:', restoredBuyer.name);
  console.log('  削除日時:', restoredBuyer.deleted_at);

  console.log('\n✅ 買主6941は買主候補に含まれるようになりました');
}

restoreBuyer6941().catch(console.error);
