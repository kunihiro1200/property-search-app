/**
 * 特定の物件番号の買主のみを再同期
 * 使用例: npx ts-node resync-buyers-for-property.ts AA6381
 */

import { EnhancedBuyerSyncService } from './src/services/EnhancedBuyerSyncService';
import { BuyerLinkageService } from './src/services/BuyerLinkageService';
import { BuyerLinkageCache } from './src/services/BuyerLinkageCache';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const propertyNumber = process.argv[2];

  if (!propertyNumber) {
    console.error('使用方法: npx ts-node resync-buyers-for-property.ts <物件番号>');
    console.error('例: npx ts-node resync-buyers-for-property.ts AA6381');
    process.exit(1);
  }

  console.log(`=== 物件番号 ${propertyNumber} の買主を再同期 ===\n`);

  const linkageService = new BuyerLinkageService();
  const cache = new BuyerLinkageCache();

  // 同期前の状態を確認
  console.log('📊 同期前の状態を確認中...\n');
  const beforeCount = await linkageService.getBuyerCountForProperty(propertyNumber);
  console.log(`同期前の買主数: ${beforeCount}件\n`);

  // 全体の再同期を実行
  console.log('🔄 再同期を実行中...\n');
  const syncService = new EnhancedBuyerSyncService();
  
  try {
    const result = await syncService.syncWithPropertyValidation();

    console.log('\n=== 同期結果 ===');
    console.log(`✅ 作成: ${result.created}件`);
    console.log(`🔄 更新: ${result.updated}件`);
    console.log(`❌ 失敗: ${result.failed}件`);
    console.log(`⏭️  スキップ: ${result.skipped}件\n`);

    // 同期後の状態を確認
    console.log('📊 同期後の状態を確認中...\n');
    const afterCount = await linkageService.getBuyerCountForProperty(propertyNumber);
    console.log(`同期後の買主数: ${afterCount}件`);
    
    const diff = afterCount - beforeCount;
    console.log(`変化: ${diff >= 0 ? '+' : ''}${diff}件\n`);

    // キャッシュを無効化
    console.log('🗑️  キャッシュを無効化中...\n');
    await cache.invalidate(propertyNumber);
    console.log('✅ キャッシュ無効化完了\n');

    // 買主リストを取得して表示
    console.log('📋 買主リストを取得中...\n');
    const buyers = await linkageService.getBuyersForProperty(propertyNumber, {
      sortBy: 'reception_date',
      sortOrder: 'desc',
      limit: 10
    });

    if (buyers.length > 0) {
      console.log(`=== 買主リスト（最新10件） ===`);
      buyers.forEach((buyer, index) => {
        console.log(`  ${index + 1}. ${buyer.buyer_number} - ${buyer.name}`);
        console.log(`     受付日: ${buyer.reception_date}`);
        console.log(`     確度: ${buyer.inquiry_confidence || '(未設定)'}`);
        console.log(`     ステータス: ${buyer.latest_status || '(未設定)'}`);
      });
    } else {
      console.log('買主が見つかりませんでした。');
    }

    console.log('\n✅ 完了');

  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
