import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixNullBuyerIds() {
  console.log('🔍 NULL buyer_idを持つ買主を検索中...\n');

  // NULL buyer_idを持つ買主を取得
  const { data: buyersWithNullId, error: fetchError } = await supabase
    .from('buyers')
    .select('id, name, email, buyer_id')
    .is('buyer_id', null)
    .order('id');

  if (fetchError) {
    console.error('❌ エラー:', fetchError);
    return;
  }

  if (!buyersWithNullId || buyersWithNullId.length === 0) {
    console.log('✅ NULL buyer_idを持つ買主は見つかりませんでした');
    return;
  }

  console.log(`📊 NULL buyer_idを持つ買主: ${buyersWithNullId.length}人\n`);

  let successCount = 0;
  let errorCount = 0;

  // 各買主のbuyer_idを修正
  for (const buyer of buyersWithNullId) {
    // UUIDを生成
    const newBuyerId = randomUUID();

    // buyer_idを更新（idカラムで特定）
    const { error: updateError } = await supabase
      .from('buyers')
      .update({ buyer_id: newBuyerId })
      .eq('id', buyer.id);

    if (updateError) {
      console.error(`❌ 買主番号 ${buyer.id} の更新エラー:`, updateError);
      errorCount++;
    } else {
      console.log(`✅ 買主番号 ${buyer.id} (${buyer.name || '名前なし'}) を更新: buyer_id=${newBuyerId.substring(0, 8)}...`);
      successCount++;
    }
  }

  console.log('\n📈 修正結果:');
  console.log(`  ✅ 成功: ${successCount}人`);
  console.log(`  ❌ 失敗: ${errorCount}人`);
  console.log(`  📊 合計: ${buyersWithNullId.length}人`);
}

// 実行
fixNullBuyerIds()
  .then(() => {
    console.log('\n✨ 処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 予期しないエラー:', error);
    process.exit(1);
  });
