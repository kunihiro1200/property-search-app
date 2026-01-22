// 全買い主の配信タイプを監査し、問題のあるデータを特定・修正
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

async function auditAllBuyerDistributionTypes() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== 全買い主の配信タイプ監査 ===\n');

  // 1. 全買い主を取得
  const { data: allBuyers, error: fetchError } = await supabase
    .from('buyers')
    .select('buyer_number, email, distribution_type, latest_status, desired_area')
    .order('buyer_number');

  if (fetchError) {
    console.error('買い主取得エラー:', fetchError.message);
    return;
  }

  console.log(`総買い主数: ${allBuyers?.length || 0}件\n`);

  // 2. 配信タイプの統計を取得
  const distributionTypeStats: Record<string, number> = {};
  const statusStats: Record<string, number> = {};
  const problematicBuyers: any[] = [];

  const validDistributionTypes = ['配信中', '配信希望', '配信停止中'];
  const validStatuses = ['配信中', '配信停止中', '配信希望'];

  for (const buyer of allBuyers || []) {
    // 配信タイプの統計
    const distType = buyer.distribution_type || 'null';
    distributionTypeStats[distType] = (distributionTypeStats[distType] || 0) + 1;

    // ステータスの統計
    const status = buyer.latest_status || 'null';
    statusStats[status] = (statusStats[status] || 0) + 1;

    // 問題のある買い主を特定
    const hasInvalidDistType = !validDistributionTypes.includes(buyer.distribution_type);
    const hasInvalidStatus = !validStatuses.includes(buyer.latest_status) && buyer.latest_status !== null;
    const hasNullStatus = buyer.latest_status === null;

    if (hasInvalidDistType || hasInvalidStatus || hasNullStatus) {
      problematicBuyers.push({
        buyer_number: buyer.buyer_number,
        email: buyer.email,
        distribution_type: buyer.distribution_type,
        latest_status: buyer.latest_status,
        desired_area: buyer.desired_area,
        issues: [
          hasInvalidDistType && `無効な配信タイプ: ${buyer.distribution_type}`,
          hasInvalidStatus && `無効なステータス: ${buyer.latest_status}`,
          hasNullStatus && 'ステータスがnull'
        ].filter(Boolean)
      });
    }
  }

  // 3. 統計を表示
  console.log('【配信タイプの分布】');
  Object.entries(distributionTypeStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const isValid = validDistributionTypes.includes(type);
      const marker = isValid ? '✓' : '✗';
      console.log(`  ${marker} ${type}: ${count}件`);
    });

  console.log('\n【ステータスの分布】');
  Object.entries(statusStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const isValid = validStatuses.includes(status) || status === 'null';
      const marker = isValid ? '✓' : '✗';
      console.log(`  ${marker} ${status}: ${count}件`);
    });

  // 4. 問題のある買い主を表示
  console.log(`\n【問題のある買い主: ${problematicBuyers.length}件】\n`);
  
  if (problematicBuyers.length === 0) {
    console.log('✓ 問題のある買い主は見つかりませんでした。');
    return;
  }

  // 最初の10件を表示
  const displayCount = Math.min(10, problematicBuyers.length);
  console.log(`最初の${displayCount}件を表示:\n`);
  
  for (let i = 0; i < displayCount; i++) {
    const buyer = problematicBuyers[i];
    console.log(`${i + 1}. 買い主番号: ${buyer.buyer_number}`);
    console.log(`   メール: ${buyer.email}`);
    console.log(`   配信タイプ: ${buyer.distribution_type}`);
    console.log(`   ステータス: ${buyer.latest_status}`);
    console.log(`   希望エリア: ${buyer.desired_area}`);
    console.log(`   問題: ${buyer.issues.join(', ')}`);
    console.log('');
  }

  if (problematicBuyers.length > displayCount) {
    console.log(`... 他 ${problematicBuyers.length - displayCount}件\n`);
  }

  // 5. 修正提案
  console.log('【修正提案】\n');
  
  const needsDistTypeFixCount = problematicBuyers.filter(b => 
    !validDistributionTypes.includes(b.distribution_type)
  ).length;
  
  const needsStatusFixCount = problematicBuyers.filter(b => 
    b.latest_status === null || !validStatuses.includes(b.latest_status)
  ).length;

  console.log(`配信タイプ修正が必要: ${needsDistTypeFixCount}件`);
  console.log(`ステータス修正が必要: ${needsStatusFixCount}件`);
  
  console.log('\n修正スクリプトを実行しますか？ (y/n)');
  console.log('実行する場合は、backend/fix-all-buyer-distribution-types.ts を実行してください。');

  // 6. 修正用のデータをJSONファイルに出力
  const fs = require('fs');
  const outputPath = path.join(__dirname, 'problematic-buyers.json');
  fs.writeFileSync(outputPath, JSON.stringify(problematicBuyers, null, 2));
  console.log(`\n問題のある買い主データを ${outputPath} に出力しました。`);
}

auditAllBuyerDistributionTypes().catch(console.error);
