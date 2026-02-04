import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testSidebarCountsAPI() {
  console.log('=== サイドバーカウントAPIのテスト ===\n');

  // SellerServiceのgetSidebarCountsメソッドを直接呼び出す
  const { SellerService } = await import('./src/services/SellerService.supabase');
  const sellerService = new SellerService();
  
  const counts = await sellerService.getSidebarCounts();
  
  console.log('✅ APIレスポンス:');
  console.log(JSON.stringify(counts, null, 2));
  
  console.log('\n=== assigneeGroupsの詳細 ===\n');
  
  if (counts.assigneeGroups && counts.assigneeGroups.length > 0) {
    counts.assigneeGroups.forEach(group => {
      console.log(`担当(${group.initial}):`);
      console.log(`  全体: ${group.totalCount}`);
      console.log(`  当日TEL: ${group.todayCallCount}`);
      console.log(`  その他: ${group.otherCount}`);
      console.log('');
    });
  } else {
    console.log('❌ assigneeGroupsが空です');
  }
  
  console.log('\n=== AA13542の確認 ===\n');
  
  // AA13542のデータを取得
  const { data: aa13542 } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13542')
    .single();
  
  if (aa13542) {
    console.log('営担:', aa13542.visit_assignee || '（空欄）');
    console.log('次電日:', aa13542.next_call_date);
    console.log('状況:', aa13542.status);
    
    // Yの担当グループを確認
    const yGroup = counts.assigneeGroups?.find(g => g.initial === 'Y');
    if (yGroup) {
      console.log('\n担当(Y)のカウント:');
      console.log(`  全体: ${yGroup.totalCount}`);
      console.log(`  当日TEL: ${yGroup.todayCallCount}`);
      console.log(`  その他: ${yGroup.otherCount}`);
      
      if (aa13542.visit_assignee === 'Y') {
        console.log('\n⚠️  AA13542は営担がYなので、担当(Y)に含まれるべき');
      } else {
        console.log('\n✅ AA13542は営担が空欄なので、担当(Y)に含まれないべき');
      }
    }
  }
}

testSidebarCountsAPI().catch(console.error);
