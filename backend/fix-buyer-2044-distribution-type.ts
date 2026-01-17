// 買い主2044 (oscar.yag74@gmail.com) の配信タイプを修正
// distribution_type: "要" → "配信希望"
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixBuyer2044DistributionType() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== 買い主2044の配信タイプ修正 ===\n');

  // 1. 現在の状態を確認
  const { data: before, error: beforeError } = await supabase
    .from('buyers')
    .select('buyer_number, email, distribution_type, desired_area, latest_status')
    .eq('buyer_number', '2044')
    .single();

  if (beforeError) {
    console.error('買い主取得エラー:', beforeError.message);
    return;
  }

  console.log('【修正前】');
  console.log(`買い主番号: ${before.buyer_number}`);
  console.log(`メール: ${before.email}`);
  console.log(`配信タイプ: ${before.distribution_type}`);
  console.log(`希望エリア: ${before.desired_area}`);
  console.log(`ステータス: ${before.latest_status}`);

  // 2. 配信タイプを更新
  const { error: updateError } = await supabase
    .from('buyers')
    .update({ 
      distribution_type: '配信希望',
      latest_status: '配信希望' // ステータスもnullから更新
    })
    .eq('buyer_number', '2044');

  if (updateError) {
    console.error('\n更新エラー:', updateError.message);
    return;
  }

  console.log('\n✓ 更新成功');

  // 3. 更新後の状態を確認
  const { data: after, error: afterError } = await supabase
    .from('buyers')
    .select('buyer_number, email, distribution_type, desired_area, latest_status')
    .eq('buyer_number', '2044')
    .single();

  if (afterError) {
    console.error('確認エラー:', afterError.message);
    return;
  }

  console.log('\n【修正後】');
  console.log(`買い主番号: ${after.buyer_number}`);
  console.log(`メール: ${after.email}`);
  console.log(`配信タイプ: ${after.distribution_type}`);
  console.log(`希望エリア: ${after.desired_area}`);
  console.log(`ステータス: ${after.latest_status}`);

  console.log('\n=== 完了 ===');
  console.log('買い主2044はAA5852の配信対象に含まれるようになりました。');
}

fixBuyer2044DistributionType().catch(console.error);
