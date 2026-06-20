/**
 * AA13485とAA13486を手動で同期
 */
import { EnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

async function manualSync() {
  try {
    console.log('🔄 Starting manual sync for AA13485 and AA13486...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

    const syncService = new EnhancedAutoSyncService(supabaseUrl, supabaseServiceKey);
    await syncService.initialize();

    // 不足している売主を検出
    console.log('🔍 Detecting missing sellers...');
    const missingSellers = await syncService.detectMissingSellers();
    console.log(`📊 Total missing sellers: ${missingSellers.length}\n`);

    // AA13485とAA13486が含まれているか確認
    const targetSellers = ['AA13485', 'AA13486'];
    const foundTargets = targetSellers.filter(num => missingSellers.includes(num));

    if (foundTargets.length === 0) {
      console.log('❌ AA13485とAA13486は不足売主リストに含まれていません');
      console.log('   考えられる原因:');
      console.log('     1. 既にデータベースに存在する');
      console.log('     2. スプレッドシートに存在しない');
      console.log('     3. 売主番号の形式が異なる\n');
      
      // 最初の10件を表示
      if (missingSellers.length > 0) {
        console.log('不足売主リストの例（最初の10件）:');
        missingSellers.slice(0, 10).forEach(num => console.log(`  ${num}`));
      }
      
      return;
    }

    console.log(`✅ 以下の売主が不足売主リストに含まれています:`);
    foundTargets.forEach(num => console.log(`  ${num}`));
    console.log('');

    // 同期を実行
    console.log('🔄 Syncing missing sellers...');
    const result = await syncService.syncMissingSellers(foundTargets);

    console.log('\n='.repeat(80));
    console.log('同期結果');
    console.log('='.repeat(80));
    console.log(`成功: ${result.success ? 'はい' : 'いいえ'}`);
    console.log(`新規追加: ${result.newSellersCount}件`);
    console.log(`エラー: ${result.errors.length}件`);
    console.log(`処理時間: ${(result.endTime.getTime() - result.startTime.getTime()) / 1000}秒\n`);

    if (result.errors.length > 0) {
      console.log('エラー詳細:');
      result.errors.forEach(err => {
        console.log(`  ${err.sellerNumber}: ${err.message}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

manualSync();
