/**
 * 定期データ整合性チェックスクリプト
 * cronジョブやスケジューラーから実行することを想定
 */
import * as dotenv from 'dotenv';
import { DataIntegrityService } from './src/services/DataIntegrityService';

dotenv.config();

async function runScheduledCheck() {
  console.log('=== 定期データ整合性チェック ===');
  console.log(`実行日時: ${new Date().toISOString()}\n`);

  const service = new DataIntegrityService(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. 整合性チェック
  console.log('📊 整合性チェック実行中...');
  const result = await service.checkIntegrity();

  console.log(`\n結果:`);
  console.log(`  売主数: ${result.totalSellers}`);
  console.log(`  物件数: ${result.totalProperties}`);
  console.log(`  物件なし売主: ${result.sellersWithoutProperty}`);
  console.log(`  孤立物件: ${result.orphanedProperties}`);
  console.log(`  重複物件: ${result.duplicateProperties}`);

  if (result.isHealthy) {
    console.log('\n✅ データ整合性は正常です');
    return;
  }

  console.log('\n⚠️ 問題が検出されました:');
  result.issues.forEach(issue => console.log(`  - ${issue}`));

  // 2. 自動修復（オプション）
  const autoRepair = process.env.AUTO_REPAIR_INTEGRITY === 'true';
  
  if (!autoRepair) {
    console.log('\n自動修復は無効です。手動で修復してください。');
    console.log('自動修復を有効にするには: AUTO_REPAIR_INTEGRITY=true');
    return;
  }

  console.log('\n🔧 自動修復を実行中...');

  // 物件なし売主を修復
  if (result.sellersWithoutProperty > 0) {
    console.log('  物件なし売主を修復中...');
    const repairResult = await service.repairMissingProperties();
    console.log(`    作成: ${repairResult.created}件, エラー: ${repairResult.errors}件`);
  }

  // 孤立物件を修復
  if (result.orphanedProperties > 0) {
    console.log('  孤立物件を修復中...');
    const repairResult = await service.repairOrphanedProperties();
    console.log(`    削除: ${repairResult.deleted}件, エラー: ${repairResult.errors}件`);
  }

  // 3. 修復後の確認
  console.log('\n📊 修復後の確認...');
  const finalResult = await service.checkIntegrity();
  
  if (finalResult.isHealthy) {
    console.log('✅ 修復完了。データ整合性は正常です');
  } else {
    console.log('⚠️ まだ問題が残っています:');
    finalResult.issues.forEach(issue => console.log(`  - ${issue}`));
  }
}

runScheduledCheck().catch(console.error);
