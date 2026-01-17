import dotenv from 'dotenv';
import { SellerSyncService } from './src/services/SellerSyncService';

dotenv.config();

async function manualSyncSellers() {
  console.log('🔄 売主データの手動同期を開始します...\n');

  try {
    const syncService = new SellerSyncService();
    
    console.log('📊 スプレッドシートからデータを取得中...');
    const result = await syncService.syncSellers();
    
    console.log('\n✅ 同期完了！');
    console.log(`   追加: ${result.added}件`);
    console.log(`   更新: ${result.updated}件`);
    console.log(`   スキップ: ${result.skipped}件`);
    console.log(`   エラー: ${result.errors}件`);
    
    if (result.errors > 0) {
      console.log('\n⚠️  エラーが発生しました。詳細はログを確認してください。');
    }
    
    console.log('\n🎯 次のステップ:');
    console.log('   1. フロントエンドで売主一覧ページをリロード');
    console.log('   2. AA13423の詳細ページで反響年とサイトを確認');
    
  } catch (error: any) {
    console.error('❌ 同期エラー:', error.message);
    console.error(error);
    process.exit(1);
  }
}

manualSyncSellers()
  .then(() => {
    console.log('\n✅ スクリプト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
