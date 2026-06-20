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
 * 反響日付が指定日数以内の売主のみを同期
 */
async function syncRecentSellers(daysBack: number = 3) {
  console.log(`🔄 反響日付が${daysBack}日以内の売主を同期します...\n`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const syncService = new EnhancedAutoSyncService(supabaseUrl, supabaseServiceKey);

  try {
    // 初期化
    await syncService.initialize();

    // カットオフ日を計算（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60; // 9時間 = 540分
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jstTime = new Date(utcTime + (jstOffset * 60000));
    
    const cutoffDate = new Date(jstTime);
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    cutoffDate.setHours(0, 0, 0, 0);
    
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    console.log(`📅 カットオフ日: ${cutoffDateStr}（${daysBack}日前）`);
    console.log(`📅 今日（JST）: ${jstTime.toISOString().split('T')[0]}\n`);

    // データベースから反響日付が指定日数以内の売主を取得
    const { data: recentSellers, error } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, status, updated_at')
      .gte('inquiry_date', cutoffDateStr)
      .order('inquiry_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch recent sellers: ${error.message}`);
    }

    if (!recentSellers || recentSellers.length === 0) {
      console.log('✅ 反響日付が指定日数以内の売主はいません');
      return;
    }

    console.log(`📊 対象売主数: ${recentSellers.length}`);
    console.log(`   最新の反響日付: ${recentSellers[0].inquiry_date}`);
    console.log(`   最古の反響日付: ${recentSellers[recentSellers.length - 1].inquiry_date}\n`);

    // 売主番号のリストを作成
    const sellerNumbers = recentSellers.map(s => s.seller_number);

    // 更新同期を実行
    console.log('🔄 更新同期を開始...\n');
    const result = await syncService.syncUpdatedSellers(sellerNumbers);

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

// コマンドライン引数から日数を取得（デフォルト: 3日）
const daysBack = process.argv[2] ? parseInt(process.argv[2], 10) : 3;

if (isNaN(daysBack) || daysBack < 1) {
  console.error('❌ 無効な日数です。1以上の整数を指定してください。');
  process.exit(1);
}

syncRecentSellers(daysBack);
