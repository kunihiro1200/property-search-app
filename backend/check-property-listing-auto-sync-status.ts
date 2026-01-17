/**
 * 物件リスト自動同期ステータスチェック
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkAutoSyncStatus() {
  console.log('='.repeat(60));
  console.log('物件リスト自動同期ステータス');
  console.log('='.repeat(60));
  console.log();

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. 最近の同期ログを確認
    console.log('📊 最近の同期ログ (property_listing_update)');
    console.log('-'.repeat(60));
    
    const { data: logs, error: logsError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'property_listing_update')
      .order('started_at', { ascending: false })
      .limit(10);
    
    if (logsError) {
      console.log('❌ sync_logsテーブルの読み込みエラー:', logsError.message);
    } else if (!logs || logs.length === 0) {
      console.log('⚠️  property_listing_updateの同期ログが見つかりません');
      console.log('   自動同期が一度も実行されていない可能性があります');
    } else {
      console.log(`✅ ${logs.length}件の同期ログを発見`);
      console.log();
      
      logs.forEach((log, index) => {
        console.log(`[${index + 1}] ${log.started_at}`);
        console.log(`    Status: ${log.status}`);
        console.log(`    Updated: ${log.properties_updated || 0}`);
        console.log(`    Failed: ${log.properties_failed || 0}`);
        console.log(`    Duration: ${log.duration_ms}ms`);
        if (log.error_details) {
          console.log(`    Errors: ${JSON.stringify(log.error_details).substring(0, 100)}...`);
        }
        console.log();
      });
    }

    // 2. EnhancedAutoSyncServiceの設定確認
    console.log('⚙️  自動同期サービス設定');
    console.log('-'.repeat(60));
    console.log('環境変数:');
    console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`  SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '(デフォルト)'}`);
    console.log();

    // 3. AA4885の最終更新日時
    console.log('🔍 AA4885の最終更新日時');
    console.log('-'.repeat(60));
    
    const { data: aa4885, error: aa4885Error } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, updated_at')
      .eq('property_number', 'AA4885')
      .single();
    
    if (aa4885Error) {
      console.log('❌ AA4885の取得エラー:', aa4885Error.message);
    } else {
      console.log(`物件番号: ${aa4885.property_number}`);
      console.log(`ATBB状態: "${aa4885.atbb_status}"`);
      console.log(`最終更新: ${aa4885.updated_at}`);
      
      const lastUpdate = new Date(aa4885.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      
      console.log(`経過時間: ${hoursSinceUpdate.toFixed(1)}時間前`);
    }
    console.log();

    // 4. 診断結果
    console.log('📝 診断結果');
    console.log('-'.repeat(60));
    
    if (!logs || logs.length === 0) {
      console.log('❌ 問題: 自動同期が実行されていません');
      console.log();
      console.log('💡 考えられる原因:');
      console.log('  1. EnhancedAutoSyncServiceが起動していない');
      console.log('  2. property_listing_updateの同期が設定されていない');
      console.log('  3. バックエンドサーバーが起動していない');
      console.log();
      console.log('🔧 解決策:');
      console.log('  1. バックエンドサーバーを起動: npm run dev');
      console.log('  2. EnhancedAutoSyncServiceの設定を確認');
      console.log('  3. 手動同期を実行してテスト');
    } else {
      const lastLog = logs[0];
      const lastSyncTime = new Date(lastLog.started_at);
      const now = new Date();
      const hoursSinceSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);
      
      console.log(`最後の同期: ${hoursSinceSync.toFixed(1)}時間前`);
      console.log(`同期ステータス: ${lastLog.status}`);
      
      if (hoursSinceSync > 1) {
        console.log();
        console.log('⚠️  注意: 最後の同期から1時間以上経過しています');
        console.log('   自動同期の間隔を確認してください');
      }
      
      if (lastLog.status === 'error') {
        console.log();
        console.log('❌ 最後の同期がエラーで終了しています');
        console.log('   エラー詳細を確認してください');
      }
    }

    console.log();
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkAutoSyncStatus().catch(console.error);
