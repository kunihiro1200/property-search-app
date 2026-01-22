/**
 * 最近の同期ログを確認するスクリプト
 * 
 * 使い方:
 *   npx ts-node check-recent-sync-logs.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkRecentSyncLogs() {
  console.log('🔍 最近の同期ログを確認します...\n');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // sync_logsテーブルが存在するか確認
    const { data: tables, error: tableError } = await supabase
      .from('sync_logs')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('⚠️  sync_logsテーブルが見つかりません');
      console.log('   このテーブルは自動同期のログを記録するために使用されます');
      console.log('   テーブルがなくても自動同期は動作しますが、ログは記録されません\n');
      
      console.log('💡 代わりに、バックエンドサーバーのコンソールログを確認してください:');
      console.log('   - "Phase 4.5: Property Listing Update Sync"');
      console.log('   - "✅ Property listing update sync: X updated"');
      return;
    }

    // 最近の同期ログを取得（物件リスト更新同期のみ）
    const { data: logs, error: logsError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'property_listing_update')
      .order('started_at', { ascending: false })
      .limit(10);

    if (logsError) {
      throw logsError;
    }

    if (!logs || logs.length === 0) {
      console.log('📊 物件リスト更新同期のログが見つかりません');
      console.log('   まだ一度も実行されていない可能性があります\n');
      
      console.log('💡 確認方法:');
      console.log('   1. バックエンドサーバーが起動しているか確認');
      console.log('   2. 自動同期が有効か確認: npx ts-node check-auto-sync-status.ts');
      console.log('   3. 手動で実行: npx ts-node verify-property-listing-sync.ts');
      return;
    }

    console.log(`📊 最近の物件リスト更新同期ログ (最新${logs.length}件):\n`);

    logs.forEach((log, index) => {
      const startedAt = new Date(log.started_at);
      const completedAt = new Date(log.completed_at);
      const duration = (completedAt.getTime() - startedAt.getTime()) / 1000;

      console.log(`${index + 1}. ${startedAt.toLocaleString('ja-JP')}`);
      console.log(`   状態: ${getStatusEmoji(log.status)} ${log.status}`);
      console.log(`   更新: ${log.properties_updated || 0}件`);
      console.log(`   失敗: ${log.properties_failed || 0}件`);
      console.log(`   実行時間: ${duration.toFixed(2)}秒`);
      
      if (log.error_details && log.error_details.errors) {
        console.log(`   エラー詳細:`);
        log.error_details.errors.forEach((err: any) => {
          console.log(`     - ${err.property_number}: ${err.error}`);
        });
      }
      
      console.log('');
    });

    // 統計情報
    const totalUpdated = logs.reduce((sum, log) => sum + (log.properties_updated || 0), 0);
    const totalFailed = logs.reduce((sum, log) => sum + (log.properties_failed || 0), 0);
    const successCount = logs.filter(log => log.status === 'success').length;

    console.log('📈 統計情報:');
    console.log(`   総実行回数: ${logs.length}回`);
    console.log(`   成功: ${successCount}回`);
    console.log(`   総更新件数: ${totalUpdated}件`);
    console.log(`   総失敗件数: ${totalFailed}件`);

    // 最後の同期からの経過時間
    const lastSync = new Date(logs[0].started_at);
    const now = new Date();
    const minutesSinceLastSync = Math.floor((now.getTime() - lastSync.getTime()) / 60000);

    console.log(`\n⏰ 最後の同期: ${minutesSinceLastSync}分前`);
    
    const intervalMinutes = parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || '5', 10);
    const nextSyncIn = intervalMinutes - (minutesSinceLastSync % intervalMinutes);
    console.log(`   次の同期予定: 約${nextSyncIn}分後`);

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.log('\n💡 トラブルシューティング:');
    console.log('   1. Supabase接続情報が正しいか確認');
    console.log('   2. sync_logsテーブルが存在するか確認');
    console.log('   3. バックエンドサーバーのコンソールログを確認');
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'success':
      return '✅';
    case 'partial_success':
      return '⚠️';
    case 'error':
      return '❌';
    default:
      return '❓';
  }
}

// 実行
checkRecentSyncLogs();
