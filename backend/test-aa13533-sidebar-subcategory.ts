/**
 * AA13533のサイドバーサブカテゴリー表示テスト
 * 
 * 期待される結果:
 * - AA13533は訪問予定(U)に含まれる（営担=U, 訪問日=2026-02-07）
 * - AA13533は当日TEL（担当）にも含まれる（次電日=2026-02-02 < 今日）
 * - サイドバーカウントAPIに todayCallAssignedByAssignee が含まれる
 * - todayCallAssignedByAssignee に { initial: 'U', count: X } が含まれる
 */

import { SellerService } from './src/services/SellerService.supabase';

async function main() {
  console.log('=== AA13533 サイドバーサブカテゴリー表示テスト ===\n');
  
  const sellerService = new SellerService();
  
  try {
    // 1. サイドバーカウントを取得
    console.log('📊 サイドバーカウントを取得中...\n');
    const counts = await sellerService.getSidebarCounts();
    
    console.log('✅ サイドバーカウント取得成功\n');
    
    // 2. todayCallAssignedByAssignee が含まれているか確認
    console.log('=== todayCallAssignedByAssignee ===');
    if (counts.todayCallAssignedByAssignee) {
      console.log('✅ todayCallAssignedByAssignee フィールドが存在します');
      console.log(`   件数: ${counts.todayCallAssignedByAssignee.length}グループ\n`);
      
      // イニシャル別に表示
      counts.todayCallAssignedByAssignee.forEach(({ initial, count }) => {
        console.log(`   ${initial}: ${count}件`);
      });
      
      // Uのカウントを確認
      const uCount = counts.todayCallAssignedByAssignee.find(d => d.initial === 'U');
      if (uCount) {
        console.log(`\n✅ イニシャル「U」の当日TEL（担当）: ${uCount.count}件`);
        console.log('   → AA13533が含まれているはずです');
      } else {
        console.log('\n⚠️  イニシャル「U」の当日TEL（担当）が見つかりません');
      }
    } else {
      console.log('❌ todayCallAssignedByAssignee フィールドが存在しません');
    }
    
    console.log('\n=== 訪問予定(U) ===');
    const visitScheduledU = counts.visitScheduledByAssignee.find(d => d.initial === 'U');
    if (visitScheduledU) {
      console.log(`✅ 訪問予定(U): ${visitScheduledU.count}件`);
    } else {
      console.log('⚠️  訪問予定(U)が見つかりません');
    }
    
    console.log('\n=== 完全なAPIレスポンス ===');
    console.log(JSON.stringify(counts, null, 2));
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
  }
}

main();
