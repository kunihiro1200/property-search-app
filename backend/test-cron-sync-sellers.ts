/**
 * 売主自動同期のローカルテストスクリプト
 * 
 * このスクリプトは、Vercel Cron Jobで実行される売主同期処理を
 * ローカル環境でテストするためのものです。
 * 
 * 実行方法:
 * cd backend
 * npx ts-node test-cron-sync-sellers.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

// 環境変数を確認
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ 環境変数が設定されていません');
  console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅' : '❌');
  process.exit(1);
}

async function testCronSyncSellers() {
  console.log('=== 売主自動同期のローカルテスト ===\n');
  console.log('📅 実行日時:', new Date().toLocaleString('ja-JP'));
  console.log('');
  
  try {
    // EnhancedAutoSyncServiceをインポート
    const { EnhancedAutoSyncService } = await import('./src/services/EnhancedAutoSyncService');
    
    // サービスを初期化
    const syncService = new EnhancedAutoSyncService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    await syncService.initialize();
    console.log('✅ EnhancedAutoSyncService initialized\n');
    
    // フル同期を実行（追加 + 更新 + 削除）
    console.log('🔄 Starting full sync (addition + update + deletion)...\n');
    const startTime = Date.now();
    
    const result = await syncService.runFullSync('manual');
    
    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
    
    // 結果を表示
    console.log('\n=== 同期結果 ===\n');
    console.log('📊 ステータス:', result.status);
    console.log('⏱️  処理時間:', durationSeconds, '秒');
    console.log('');
    
    console.log('📥 追加・更新結果:');
    console.log('   処理件数:', result.additionResult.totalProcessed);
    console.log('   追加成功:', result.additionResult.successfullyAdded);
    console.log('   更新成功:', result.additionResult.successfullyUpdated);
    console.log('   失敗:', result.additionResult.failed);
    console.log('');
    
    console.log('🗑️  削除結果:');
    console.log('   検出件数:', result.deletionResult.totalDetected);
    console.log('   削除成功:', result.deletionResult.successfullyDeleted);
    console.log('   削除失敗:', result.deletionResult.failedToDelete);
    console.log('   手動確認必要:', result.deletionResult.requiresManualReview);
    console.log('');
    
    // AA13481の査定額を確認
    console.log('=== AA13481の査定額確認 ===\n');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: aa13481, error } = await supabase
      .from('sellers')
      .select(`
        seller_number,
        valuation_amount_1,
        valuation_amount_2,
        valuation_amount_3
      `)
      .eq('seller_number', 'AA13481')
      .single();
    
    if (error) {
      console.error('❌ AA13481の取得エラー:', error.message);
    } else if (!aa13481) {
      console.log('⚠️  AA13481がデータベースに存在しません');
    } else {
      console.log('売主番号:', aa13481.seller_number);
      console.log('査定額1:', aa13481.valuation_amount_1 ? `${(aa13481.valuation_amount_1 / 10000).toLocaleString()}万円` : 'null');
      console.log('査定額2:', aa13481.valuation_amount_2 ? `${(aa13481.valuation_amount_2 / 10000).toLocaleString()}万円` : 'null');
      console.log('査定額3:', aa13481.valuation_amount_3 ? `${(aa13481.valuation_amount_3 / 10000).toLocaleString()}万円` : 'null');
      console.log('');
      
      if (aa13481.valuation_amount_1 || aa13481.valuation_amount_2 || aa13481.valuation_amount_3) {
        console.log('✅ 査定額が正常に同期されています！');
      } else {
        console.log('⚠️  査定額がまだ同期されていません');
      }
    }
    
    console.log('\n=== テスト完了 ===');
    
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  }
}

// スクリプトを実行
testCronSyncSellers().catch(console.error);
