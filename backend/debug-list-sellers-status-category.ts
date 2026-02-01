/**
 * listSellersのstatusCategory処理をデバッグ
 */

import 'dotenv/config';
import { SellerService } from './src/services/SellerService.supabase';

async function debugListSellersStatusCategory() {
  console.log('=== listSellers statusCategoryデバッグ ===\n');
  
  const sellerService = new SellerService();
  
  // visitScheduledカテゴリでlistSellersを呼び出し
  console.log('--- visitScheduled ---');
  try {
    const result = await sellerService.listSellers({
      page: 1,
      pageSize: 100,
      statusCategory: 'visitScheduled',
    });
    
    console.log('取得件数:', result.data.length);
    console.log('total:', result.total);
    
    if (result.data.length > 0) {
      result.data.forEach((seller: any, index: number) => {
        console.log(`[${index + 1}] ${seller.sellerNumber || seller.seller_number}`);
        console.log(`  visitDate: ${seller.visitDate}`);
        console.log(`  visitAssignee: ${seller.visitAssignee}`);
        console.log(`  visit_date (raw): ${seller.visit_date}`);
        console.log(`  visit_assignee (raw): ${seller.visit_assignee}`);
      });
    } else {
      console.log('データなし');
      console.log('result:', JSON.stringify(result, null, 2).substring(0, 500));
    }
  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error('スタック:', error.stack);
  }
  
  console.log('\n--- visitCompleted ---');
  try {
    const result = await sellerService.listSellers({
      page: 1,
      pageSize: 100,
      statusCategory: 'visitCompleted',
    });
    
    console.log('取得件数:', result.data.length);
    console.log('total:', result.total);
    
    if (result.data.length > 0) {
      result.data.slice(0, 3).forEach((seller: any, index: number) => {
        console.log(`[${index + 1}] ${seller.sellerNumber || seller.seller_number}`);
        console.log(`  visitDate: ${seller.visitDate}`);
        console.log(`  visitAssignee: ${seller.visitAssignee}`);
      });
    }
  } catch (error: any) {
    console.error('エラー:', error.message);
  }
  
  console.log('\n=== デバッグ完了 ===');
}

debugListSellersStatusCategory().catch(console.error);
