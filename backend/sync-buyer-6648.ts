import { BuyerSyncService } from './src/services/BuyerSyncService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

async function syncBuyer6648() {
  console.log('=== 買主6648の同期を実行 ===\n');

  const syncService = new BuyerSyncService();

  try {
    console.log('同期を開始します...');
    const result = await syncService.syncAll();
    
    console.log('\n同期結果:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('同期エラー:', error);
  }
}

syncBuyer6648().catch(console.error);
