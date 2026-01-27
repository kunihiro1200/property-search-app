import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function manualSyncCC100() {
  console.log('=== CC100の手動同期 ===\n');

  try {
    const { getEnhancedAutoSyncService } = await import('./src/services/EnhancedAutoSyncService');
    
    console.log('🔄 自動同期サービスを初期化中...');
    const syncService = getEnhancedAutoSyncService();
    await syncService.initialize();
    console.log('✅ 初期化完了\n');

    console.log('🔍 新規物件を検出中...');
    
    // runFullSyncを実行して新規物件を同期
    console.log('🔄 完全同期を実行中...');
    const result = await syncService.runFullSync('manual');
    
    console.log('\n📊 同期結果:');
    console.log(`   ステータス: ${result.status}`);
    console.log(`   売主追加: ${result.additionResult.successfullyAdded}件`);
    console.log(`   売主更新: ${result.additionResult.successfullyUpdated}件`);
    console.log(`   売主削除: ${result.deletionResult.successfullyDeleted}件`);
    console.log(`   処理時間: ${(result.totalDurationMs / 1000).toFixed(2)}秒`);
    
    // CC100がデータベースに追加されたか確認
    console.log('\n🔍 CC100がデータベースに追加されたか確認中...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: cc100, error: cc100Error } = await supabase
      .from('property_listings')
      .select('property_number, created_at')
      .eq('property_number', 'CC100')
      .single();
    
    if (cc100Error && cc100Error.code !== 'PGRST116') {
      console.error('   エラー:', cc100Error);
    } else if (!cc100) {
      console.log('   ❌ CC100はまだデータベースに存在しません');
    } else {
      console.log('   ✅ CC100がデータベースに追加されました！');
      console.log(`      作成日時: ${cc100.created_at}`);
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
  }
}

manualSyncCC100()
  .then(() => {
    console.log('\n✅ 処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
