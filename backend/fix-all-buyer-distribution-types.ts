// 全買い主の配信タイプとステータスを修正
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

// 配信タイプのマッピング
const DISTRIBUTION_TYPE_MAPPING: Record<string, string> = {
  '要': '配信希望',
  '不要': '配信停止中',
  'ｍ→不要': '配信停止中',
  'メールエラー': '配信停止中',
  'LINE': '配信希望',
  '買付': '配信停止中',
  'ダブり': '配信停止中',
  '案内済み（LINE未登録)': '配信停止中',
  'L→タグ付完了': '配信停止中',
  'mail（買付有）': '配信停止中',
  '内覧時ヒアリング': '配信希望',
};

// ステータスのマッピング
const STATUS_MAPPING: Record<string, string> = {
  'C': '配信希望',
  '買（専任 両手）': '配信停止中',
  '他決': '配信停止中',
  'D': '配信停止中',
  'ダブり': '配信停止中',
  'BZ': '配信希望',
  '買（一般 両手）': '配信停止中',
  'D:配信・追客不要案件（業者や確度が低く追客不要案件等）': '配信停止中',
  'AZ': '配信希望',
  'C:引っ越しは1年以上先': '配信希望',
  '内覧予定': '配信希望',
  '買（他社、片手）': '配信停止中',
  'AZ:Aだが次電日不要': '配信希望',
};

async function fixAllBuyerDistributionTypes() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== 全買い主の配信タイプとステータス修正 ===\n');

  // 1. 問題のある買い主を取得
  const { data: allBuyers, error: fetchError } = await supabase
    .from('buyers')
    .select('id, buyer_number, email, distribution_type, latest_status')
    .order('buyer_number');

  if (fetchError) {
    console.error('買い主取得エラー:', fetchError.message);
    return;
  }

  console.log(`総買い主数: ${allBuyers?.length || 0}件\n`);

  const validDistributionTypes = ['配信中', '配信希望', '配信停止中'];
  const validStatuses = ['配信中', '配信停止中', '配信希望'];

  let updatedCount = 0;
  let errorCount = 0;
  const errors: any[] = [];

  // 2. バッチ処理で更新
  for (const buyer of allBuyers || []) {
    const needsUpdate = 
      !validDistributionTypes.includes(buyer.distribution_type) ||
      (buyer.latest_status !== null && !validStatuses.includes(buyer.latest_status)) ||
      buyer.latest_status === null;

    if (!needsUpdate) {
      continue;
    }

    // 新しい値を決定
    let newDistributionType = buyer.distribution_type;
    let newStatus = buyer.latest_status;

    // 配信タイプを修正
    if (!validDistributionTypes.includes(buyer.distribution_type)) {
      newDistributionType = DISTRIBUTION_TYPE_MAPPING[buyer.distribution_type] || '配信希望';
    }

    // ステータスを修正
    if (buyer.latest_status === null) {
      newStatus = '配信希望';
    } else if (!validStatuses.includes(buyer.latest_status)) {
      newStatus = STATUS_MAPPING[buyer.latest_status] || '配信希望';
    }

    // 更新実行
    const { error: updateError } = await supabase
      .from('buyers')
      .update({
        distribution_type: newDistributionType,
        latest_status: newStatus
      })
      .eq('id', buyer.id);

    if (updateError) {
      errorCount++;
      errors.push({
        buyer_number: buyer.buyer_number,
        email: buyer.email,
        error: updateError.message
      });
      console.error(`✗ 買い主${buyer.buyer_number}の更新失敗: ${updateError.message}`);
    } else {
      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`進捗: ${updatedCount}件更新完了...`);
      }
    }
  }

  // 3. 結果を表示
  console.log('\n【修正結果】');
  console.log(`✓ 更新成功: ${updatedCount}件`);
  console.log(`✗ 更新失敗: ${errorCount}件`);

  if (errors.length > 0) {
    console.log('\n【エラー詳細】');
    errors.slice(0, 10).forEach((err, i) => {
      console.log(`${i + 1}. 買い主${err.buyer_number} (${err.email}): ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`... 他 ${errors.length - 10}件`);
    }
  }

  console.log('\n=== 完了 ===');
}

fixAllBuyerDistributionTypes().catch(console.error);
