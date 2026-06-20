/**
 * サイドバーカウントAPIを直接テスト
 */

import { SellerService } from './src/services/SellerService.supabase';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testSidebarCountsAPI() {
  console.log('=== サイドバーカウントAPIテスト ===');
  console.log('現在時刻:', new Date().toISOString());
  
  try {
    const sellerService = new SellerService();
    const counts = await sellerService.getSidebarCounts();
    
    console.log('\n--- サイドバーカウント結果 ---');
    console.log('当日TEL分:', counts.todayCall);
    console.log('当日TEL（内容）:', counts.todayCallWithInfo);
    console.log('当日TEL（担当）:', counts.todayCallAssigned);
    console.log('訪問予定:', counts.visitScheduled);
    console.log('訪問済み:', counts.visitCompleted);
    console.log('未査定:', counts.unvaluated);
    console.log('査定（郵送）:', counts.mailingPending);
    
    console.log('\n=== テスト完了 ===');
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testSidebarCountsAPI().catch(console.error);
