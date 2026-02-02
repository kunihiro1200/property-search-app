/**
 * サイドバーカウントAPIのテスト
 * 
 * 目的: /api/sellers/sidebar-counts APIが正しくtodayCallWithInfoGroupsを返すか確認
 */

import { SellerService } from './src/services/SellerService.supabase';

async function testSidebarCountsAPI() {
  console.log('🧪 サイドバーカウントAPIのテスト開始\n');
  
  const sellerService = new SellerService();
  
  try {
    // サイドバーカウントを取得
    const counts = await sellerService.getSidebarCounts();
    
    console.log('📊 サイドバーカウント結果:');
    console.log('  - 当日TEL分:', counts.todayCall);
    console.log('  - 当日TEL（内容）:', counts.todayCallWithInfo);
    console.log('  - 当日TEL（担当）:', counts.todayCallAssigned);
    console.log('  - 訪問予定:', counts.visitScheduled);
    console.log('  - 訪問済み:', counts.visitCompleted);
    console.log('  - 未査定:', counts.unvaluated);
    console.log('  - 査定（郵送）:', counts.mailingPending);
    console.log('  - 当日TEL_未着手:', counts.todayCallNotStarted);
    console.log('  - Pinrich空欄:', counts.pinrichEmpty);
    console.log('');
    
    console.log('📋 当日TEL（内容）のグループ化:');
    if (counts.todayCallWithInfoGroups && counts.todayCallWithInfoGroups.length > 0) {
      counts.todayCallWithInfoGroups.forEach((group, index) => {
        console.log(`  ${index + 1}. ${group.label}: ${group.count}件`);
      });
      console.log('');
      
      // AA9492が含まれているか確認
      const aa9492Group = counts.todayCallWithInfoGroups.find(g => 
        g.label.includes('メール を優先して希望')
      );
      
      if (aa9492Group) {
        console.log('✅ AA9492のグループが見つかりました:');
        console.log(`   ラベル: ${aa9492Group.label}`);
        console.log(`   件数: ${aa9492Group.count}`);
      } else {
        console.log('❌ AA9492のグループが見つかりませんでした');
        console.log('   期待されるラベル: 当日TEL(メール を優先して希望)');
      }
    } else {
      console.log('  ⚠️ グループが空です');
    }
    
    console.log('\n✅ テスト完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

testSidebarCountsAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
