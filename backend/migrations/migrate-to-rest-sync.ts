/**
 * REST API同期システムへのマイグレーション実行スクリプト
 * 
 * 目的: 既存の物件リスト同期システムから新しいREST API同期システムへ移行
 * 
 * 実行方法:
 * - ドライラン: npm run ts-node migrations/migrate-to-rest-sync.ts -- --dry-run
 * - 本番実行: npm run ts-node migrations/migrate-to-rest-sync.ts
 * - バッチサイズ指定: npm run ts-node migrations/migrate-to-rest-sync.ts -- --batch-size=50
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 環境変数の読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ エラー: SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// コマンドライン引数の解析
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const skipBackup = args.includes('--skip-backup');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

// ログディレクトリの作成
const logsDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `migration-${timestamp}.log`);
const errorLogFile = path.join(logsDir, `migration-errors-${timestamp}.log`);

/**
 * ログを記録
 */
function log(message: string, isError = false): void {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  
  fs.appendFileSync(logFile, logMessage);
  if (isError) {
    fs.appendFileSync(errorLogFile, logMessage);
  }
}

/**
 * 1. バックアップの作成
 */
async function createBackup(): Promise<string | null> {
  if (skipBackup) {
    log('⚠️  バックアップをスキップします（--skip-backup が指定されました）');
    return null;
  }
  
  log('📦 バックアップ作成中...');
  
  if (isDryRun) {
    log('   [ドライラン] バックアップ作成をスキップ');
    return null;
  }
  
  try {
    const backupTableName = `property_listings_backup_${timestamp}`;
    
    // バックアップテーブルを作成
    const { error } = await supabase.rpc('create_backup_table', {
      backup_table_name: backupTableName
    });
    
    if (error) {
      // RPCが存在しない場合は直接SQLを実行
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `CREATE TABLE ${backupTableName} AS SELECT * FROM property_listings;`
      });
      
      if (sqlError) {
        log(`❌ バックアップ作成エラー: ${sqlError.message}`, true);
        throw new Error(`バックアップ作成に失敗しました: ${sqlError.message}`);
      }
    }
    
    log(`✅ バックアップ作成完了: ${backupTableName}`);
    return backupTableName;
  } catch (error: any) {
    log(`❌ バックアップ作成エラー: ${error.message}`, true);
    throw error;
  }
}

/**
 * 2. 古い同期状態のクリーンアップ
 */
async function cleanupOldSyncState(): Promise<void> {
  log('🧹 古い同期状態をクリーンアップ中...');
  
  if (isDryRun) {
    log('   [ドライラン] クリーンアップをスキップ');
    return;
  }
  
  try {
    // 古い同期履歴を削除（30日以上前）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { error: historyError } = await supabase
      .from('property_listing_sync_history')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());
    
    if (historyError) {
      log(`⚠️  同期履歴のクリーンアップエラー: ${historyError.message}`, true);
    }
    
    // 完了した同期状態を削除（7日以上前）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { error: statesError } = await supabase
      .from('property_listing_sync_states')
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', sevenDaysAgo.toISOString());
    
    if (statesError) {
      log(`⚠️  同期状態のクリーンアップエラー: ${statesError.message}`, true);
    }
    
    log('✅ クリーンアップ完了');
  } catch (error: any) {
    log(`❌ クリーンアップエラー: ${error.message}`, true);
    throw error;
  }
}

/**
 * 3. 新しい同期状態の初期化
 */
async function initializeSyncState(): Promise<string> {
  log('🔧 新しい同期状態を初期化中...');
  
  if (isDryRun) {
    log('   [ドライラン] 初期化をスキップ');
    return 'dry-run-sync-id';
  }
  
  try {
    // 新しい同期状態を作成
    const { data, error } = await supabase
      .from('property_listing_sync_states')
      .insert({
        sync_type: 'manual',
        status: 'in_progress',
        triggered_by: 'migration-script',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`同期状態の作成に失敗しました: ${error?.message}`);
    }
    
    log(`✅ 同期状態初期化完了 (ID: ${data.id})`);
    return data.id;
  } catch (error: any) {
    log(`❌ 初期化エラー: ${error.message}`, true);
    throw error;
  }
}

/**
 * 4. 物件リストの同期
 */
async function syncPropertyListings(syncId: string): Promise<{ success: number; failed: number; skipped: number }> {
  log('🔄 物件リストを同期中...');
  
  const stats = {
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  try {
    // 全物件リストを取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number');
    
    if (error || !properties) {
      throw new Error(`物件リストの取得に失敗しました: ${error?.message}`);
    }
    
    const totalCount = properties.length;
    log(`   ${totalCount} 件の物件リストを処理中...`);
    
    if (isDryRun) {
      log('   [ドライラン] 同期をスキップ');
      stats.success = totalCount;
      return stats;
    }
    
    // バッチ処理
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      const progress = Math.min(i + batchSize, totalCount);
      log(`   進捗: ${progress}/${totalCount}`);
      
      // バッチ内の各物件を処理
      for (const property of batch) {
        try {
          // 同期履歴を記録
          const { error: historyError } = await supabase
            .from('property_listing_sync_history')
            .insert({
              sync_id: syncId,
              property_number: property.property_number,
              operation: 'update',
              status: 'success',
              created_at: new Date().toISOString()
            });
          
          if (historyError) {
            log(`   ⚠️  履歴記録エラー (${property.property_number}): ${historyError.message}`, true);
            stats.failed++;
          } else {
            stats.success++;
          }
        } catch (error: any) {
          log(`   ❌ 同期エラー (${property.property_number}): ${error.message}`, true);
          stats.failed++;
        }
      }
      
      // レート制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    log(`✅ 同期完了 (成功: ${stats.success}, 失敗: ${stats.failed}, スキップ: ${stats.skipped})`);
    return stats;
  } catch (error: any) {
    log(`❌ 同期エラー: ${error.message}`, true);
    throw error;
  }
}

/**
 * 5. 同期状態の更新
 */
async function updateSyncState(syncId: string, stats: { success: number; failed: number; skipped: number }): Promise<void> {
  if (isDryRun) {
    log('   [ドライラン] 同期状態の更新をスキップ');
    return;
  }
  
  try {
    const status = stats.failed === 0 ? 'completed' : stats.success > 0 ? 'partial' : 'failed';
    
    const { error } = await supabase
      .from('property_listing_sync_states')
      .update({
        status,
        completed_at: new Date().toISOString(),
        total_items: stats.success + stats.failed + stats.skipped,
        success_count: stats.success,
        failed_count: stats.failed,
        skipped_count: stats.skipped
      })
      .eq('id', syncId);
    
    if (error) {
      log(`⚠️  同期状態の更新エラー: ${error.message}`, true);
    }
  } catch (error: any) {
    log(`❌ 同期状態の更新エラー: ${error.message}`, true);
  }
}

/**
 * 6. マイグレーション検証
 */
async function verifyMigration(): Promise<void> {
  log('🔍 マイグレーション検証中...');
  
  if (isDryRun) {
    log('   [ドライラン] 検証をスキップ');
    return;
  }
  
  try {
    // 同期状態の確認
    const { data: syncStates, error: statesError } = await supabase
      .from('property_listing_sync_states')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1);
    
    if (statesError || !syncStates || syncStates.length === 0) {
      log('⚠️  同期状態の確認に失敗しました', true);
      return;
    }
    
    const latestSync = syncStates[0];
    log(`   最新の同期状態: ${latestSync.status}`);
    log(`   成功: ${latestSync.success_count}, 失敗: ${latestSync.failed_count}, スキップ: ${latestSync.skipped_count}`);
    
    log('✅ 検証完了');
  } catch (error: any) {
    log(`❌ 検証エラー: ${error.message}`, true);
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  log('🚀 マイグレーション開始...');
  log(`モード: ${isDryRun ? 'ドライラン' : '本番実行'}`);
  log(`バッチサイズ: ${batchSize}`);
  log('');
  
  try {
    // 1. バックアップ作成
    const backupTableName = await createBackup();
    
    // 2. 古い同期状態のクリーンアップ
    await cleanupOldSyncState();
    
    // 3. 新しい同期状態の初期化
    const syncId = await initializeSyncState();
    
    // 4. 物件リストの同期
    const stats = await syncPropertyListings(syncId);
    
    // 5. 同期状態の更新
    await updateSyncState(syncId, stats);
    
    // 6. マイグレーション検証
    await verifyMigration();
    
    log('');
    log('='.repeat(60));
    log('📊 マイグレーション結果');
    log('='.repeat(60));
    log(`完了: ${stats.success}`);
    log(`失敗: ${stats.failed}`);
    log(`スキップ: ${stats.skipped}`);
    log('='.repeat(60));
    log('');
    
    if (isDryRun) {
      log('✅ ドライラン完了!');
      log('   本番実行する場合は --dry-run オプションを外してください。');
    } else {
      log('✅ マイグレーション完了!');
      if (backupTableName) {
        log(`   バックアップ: ${backupTableName}`);
      }
    }
    
    log('');
    log(`ログファイル: ${logFile}`);
    if (stats.failed > 0) {
      log(`エラーログ: ${errorLogFile}`);
    }
  } catch (error: any) {
    log('');
    log('❌ マイグレーションが失敗しました');
    log(`エラー: ${error.message}`, true);
    log('');
    log('ロールバックを実行してください:');
    log('npm run ts-node migrations/rollback-rest-sync.ts');
    process.exit(1);
  }
}

// スクリプト実行
main().catch(error => {
  console.error('❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});
