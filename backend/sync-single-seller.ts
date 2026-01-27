import { createClient } from '@supabase/supabase-js';
import { EnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルのパスを解決
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

/**
 * 単一の売主を同期
 */
async function syncSingleSeller(sellerNumber: string) {
  console.log(`🔄 ${sellerNumber}を同期します...\n`);

  const syncService = new EnhancedAutoSyncService(supabaseUrl, supabaseServiceKey);

  try {
    // 初期化
    await syncService.initialize();

    // 更新同期を実行
    console.log('🔄 更新同期を開始...\n');
    const result = await syncService.syncUpdatedSellers([sellerNumber]);

    console.log('\n📊 同期結果:');
    console.log(`   ✅ 更新成功: ${result.updatedSellersCount}`);
    console.log(`   ❌ エラー: ${result.errors.length}`);
    console.log(`   ⏱️  処理時間: ${((result.endTime.getTime() - result.startTime.getTime()) / 1000).toFixed(2)}秒`);

    if (result.errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      result.errors.forEach(error => {
        console.log(`   - ${error.sellerNumber}: ${error.message}`);
      });
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// コマンドライン引数から売主番号を取得
const sellerNumber = process.argv[2];

if (!sellerNumber) {
  console.error('❌ 売主番号を指定してください。');
  console.error('使用方法: npx ts-node backend/sync-single-seller.ts AA13483');
  process.exit(1);
}

syncSingleSeller(sellerNumber);
