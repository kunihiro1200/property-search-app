/**
 * フロントエンドのサイドバーAPIレスポンスをテスト
 * CallModePageのfetchSidebarSellers関数と同じAPIを呼び出す
 */

import 'dotenv/config';
import { SellerService } from './src/services/SellerService.supabase';

async function testFrontendSidebarApi() {
  console.log('=== フロントエンドサイドバーAPIテスト ===\n');
  
  const sellerService = new SellerService();
  
  // CallModePageのfetchSidebarSellersと同じカテゴリを取得
  const categories = [
    'visitScheduled',      // 訪問予定
    'visitCompleted',      // 訪問済み
    'todayCallAssigned',   // 当日TEL（担当）
    'todayCall',           // 当日TEL分
    'todayCallWithInfo',   // 当日TEL（内容）
    'unvaluated',          // 未査定
    'mailingPending',      // 査定（郵送）
  ];
  
  for (const category of categories) {
    console.log(`\n--- ${category} ---`);
    
    try {
      const result = await sellerService.listSellers({
        page: 1,
        pageSize: 500,
        sortBy: 'next_call_date',
        sortOrder: 'asc',
        statusCategory: category as any,
      });
      
      console.log(`取得件数: ${result.data.length}`);
      
      if (result.data.length > 0) {
        // 最初の3件のvisitDateとvisitAssigneeを確認
        const sample = result.data.slice(0, 3);
        sample.forEach((seller: any, index: number) => {
          console.log(`[${index + 1}] ${seller.sellerNumber}`);
          console.log(`  visitDate: ${seller.visitDate}`);
          console.log(`  visitAssignee: ${seller.visitAssignee}`);
          console.log(`  visit_date (raw): ${seller.visit_date}`);
          console.log(`  visit_assignee (raw): ${seller.visit_assignee}`);
        });
      }
    } catch (error: any) {
      console.error(`エラー: ${error.message}`);
    }
  }
  
  console.log('\n=== テスト完了 ===');
}

testFrontendSidebarApi().catch(console.error);
