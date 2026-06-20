import { SellerService } from './src/services/SellerService.supabase';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function test() {
  const sellerService = new SellerService();
  
  console.log('=== サイドバーカウントAPI テスト ===');
  console.log('');
  
  try {
    const counts = await sellerService.getSidebarCounts();
    
    console.log('結果:');
    console.log('  訪問予定:', counts.visitScheduled);
    console.log('  訪問済み:', counts.visitCompleted);
    console.log('  当日TEL分:', counts.todayCall);
    console.log('  当日TEL（内容）:', counts.todayCallWithInfo);
    console.log('  未査定:', counts.unvaluated);
    console.log('  査定（郵送）:', counts.mailingPending);
  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

test();
