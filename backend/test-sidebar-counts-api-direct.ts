/**
 * サイドバーカウントAPIの直接テスト
 */
import 'dotenv/config';
import { SellerService } from './src/services/SellerService.supabase';

async function testSidebarCountsApiDirect() {
  console.log('=== サイドバーカウントAPI直接テスト ===\n');
  
  const sellerService = new SellerService();
  
  try {
    const counts = await sellerService.getSidebarCounts();
    
    // APIレスポンスと同じ形式で出力
    console.log('APIレスポンス:');
    console.log(JSON.stringify(counts, null, 2));
    
    console.log('\n=== 確認 ===');
    console.log('visitScheduledByAssignee:', counts.visitScheduledByAssignee);
    console.log('visitCompletedByAssignee:', counts.visitCompletedByAssignee);
    
    console.log('\n=== テスト完了 ===');
  } catch (error) {
    console.error('エラー:', error);
  }
}

testSidebarCountsApiDirect();
