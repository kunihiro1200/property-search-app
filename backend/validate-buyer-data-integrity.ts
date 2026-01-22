// 買い主データの整合性を検証（定期実行推奨）
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

async function validateBuyerDataIntegrity(): Promise<ValidationResult> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  console.log('\n=== 買い主データ整合性検証 ===\n');

  // 1. 全買い主を取得
  const { data: allBuyers, error: fetchError } = await supabase
    .from('buyers')
    .select('buyer_number, email, distribution_type, latest_status, desired_area')
    .order('buyer_number');

  if (fetchError) {
    result.isValid = false;
    result.errors.push(`データ取得エラー: ${fetchError.message}`);
    return result;
  }

  console.log(`検証対象: ${allBuyers?.length || 0}件\n`);

  const validDistributionTypes = ['配信中', '配信希望', '配信停止中'];
  const validStatuses = ['配信中', '配信停止中', '配信希望'];

  let invalidDistTypeCount = 0;
  let invalidStatusCount = 0;
  let nullStatusCount = 0;
  let emptyDesiredAreaCount = 0;

  // 2. 各買い主を検証
  for (const buyer of allBuyers || []) {
    // 配信タイプの検証
    if (!validDistributionTypes.includes(buyer.distribution_type)) {
      invalidDistTypeCount++;
      result.errors.push(
        `買い主${buyer.buyer_number}: 無効な配信タイプ "${buyer.distribution_type}"`
      );
    }

    // ステータスの検証
    if (buyer.latest_status === null) {
      nullStatusCount++;
      result.warnings.push(
        `買い主${buyer.buyer_number}: ステータスがnull`
      );
    } else if (!validStatuses.includes(buyer.latest_status)) {
      invalidStatusCount++;
      result.errors.push(
        `買い主${buyer.buyer_number}: 無効なステータス "${buyer.latest_status}"`
      );
    }

    // 希望エリアの検証
    if (!buyer.desired_area || buyer.desired_area.trim() === '') {
      emptyDesiredAreaCount++;
      result.warnings.push(
        `買い主${buyer.buyer_number}: 希望エリアが空`
      );
    }
  }

  // 3. 結果サマリー
  console.log('【検証結果】\n');
  
  if (invalidDistTypeCount === 0 && invalidStatusCount === 0) {
    console.log('✓ すべての買い主データが正常です\n');
  } else {
    result.isValid = false;
    console.log(`✗ 問題が見つかりました:\n`);
    console.log(`  無効な配信タイプ: ${invalidDistTypeCount}件`);
    console.log(`  無効なステータス: ${invalidStatusCount}件`);
    console.log('');
  }

  if (nullStatusCount > 0 || emptyDesiredAreaCount > 0) {
    console.log('【警告】\n');
    if (nullStatusCount > 0) {
      console.log(`  ステータスがnull: ${nullStatusCount}件`);
    }
    if (emptyDesiredAreaCount > 0) {
      console.log(`  希望エリアが空: ${emptyDesiredAreaCount}件`);
    }
    console.log('');
  }

  // 4. エラー詳細（最初の10件）
  if (result.errors.length > 0) {
    console.log('【エラー詳細】（最初の10件）\n');
    result.errors.slice(0, 10).forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
    if (result.errors.length > 10) {
      console.log(`... 他 ${result.errors.length - 10}件\n`);
    }
  }

  // 5. 推奨アクション
  if (!result.isValid) {
    console.log('\n【推奨アクション】\n');
    console.log('以下のスクリプトを実行してデータを修正してください:');
    console.log('  npx ts-node fix-all-buyer-distribution-types.ts\n');
  }

  return result;
}

// スクリプトとして実行された場合
if (require.main === module) {
  validateBuyerDataIntegrity()
    .then(result => {
      if (!result.isValid) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('検証エラー:', error);
      process.exit(1);
    });
}

export { validateBuyerDataIntegrity };
