/**
 * サイドバーカウントAPIのテスト（イニシャル別カウント含む）
 */
import 'dotenv/config';
import { SellerService } from './src/services/SellerService.supabase';

async function testSidebarCountsWithAssignee() {
  console.log('=== サイドバーカウントAPIテスト（イニシャル別カウント含む） ===\n');
  
  const sellerService = new SellerService();
  
  try {
    const counts = await sellerService.getSidebarCounts();
    
    console.log('=== 基本カウント ===');
    console.log('all:', counts.all);
    console.log('visitScheduled:', counts.visitScheduled);
    console.log('visitCompleted:', counts.visitCompleted);
    console.log('todayCallAssigned:', counts.todayCallAssigned);
    console.log('todayCall:', counts.todayCall);
    console.log('todayCallWithInfo:', counts.todayCallWithInfo);
    console.log('unvaluated:', counts.unvaluated);
    console.log('mailingPending:', counts.mailingPending);
    console.log('todayCallNotStarted:', counts.todayCallNotStarted);
    console.log('pinrichEmpty:', counts.pinrichEmpty);
    
    console.log('\n=== 訪問予定（イニシャル別） ===');
    if (counts.visitScheduledByAssignee && counts.visitScheduledByAssignee.length > 0) {
      counts.visitScheduledByAssignee.forEach(({ initial, count }) => {
        console.log(`  ${initial}: ${count}件`);
      });
    } else {
      console.log('  データなし');
    }
    
    console.log('\n=== 訪問済み（イニシャル別） ===');
    if (counts.visitCompletedByAssignee && counts.visitCompletedByAssignee.length > 0) {
      counts.visitCompletedByAssignee.forEach(({ initial, count }) => {
        console.log(`  ${initial}: ${count}件`);
      });
    } else {
      console.log('  データなし');
    }
    
    console.log('\n=== テスト完了 ===');
  } catch (error) {
    console.error('エラー:', error);
  }
}

testSidebarCountsWithAssignee();
