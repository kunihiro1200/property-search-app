/**
 * SellerServiceのgetSidebarCountsを直接テストするスクリプト
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { SellerService } from './src/services/SellerService.supabase';

async function main() {
  console.log('=== SellerService.getSidebarCounts テスト ===\n');

  const sellerService = new SellerService();
  
  try {
    const counts = await sellerService.getSidebarCounts();
    console.log('📊 サイドバーカウント:');
    console.log(JSON.stringify(counts, null, 2));
    
    console.log('\n📋 詳細:');
    console.log(`  訪問予定: ${counts.visitScheduled}件`);
    console.log(`  訪問済み: ${counts.visitCompleted}件`);
    console.log(`  当日TEL（担当）: ${counts.todayCallAssigned}件`);
    console.log(`  当日TEL分: ${counts.todayCall}件`);
    console.log(`  当日TEL（内容）: ${counts.todayCallWithInfo}件`);
    console.log(`  未査定: ${counts.unvaluated}件`);
    console.log(`  査定（郵送）: ${counts.mailingPending}件`);
  } catch (error) {
    console.log(`❌ エラー: ${error}`);
  }
}

main().catch(console.error);
