/**
 * REST API同期システムマイグレーションのロールバックスクリプト
 * 
 * 目的: マイグレーションに問題が発生した場合にバックアップから復元
 * 
 * 実行方法:
 * - ドライラン: npm run ts-node migrations/rollback-rest-sync.ts -- --dry-run
 * - 本番実行: npm run ts-node migrations/rollback-rest-sync.ts
 * - 特定のバックアップから復元: npm run ts-node migrations/rollback-rest-sync.ts -- --backup-table=property_listings_backup_2025-01-09T12-00-00
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
const backupTableArg = args.find(arg => arg.startsWith('--backup-table='));
const specifiedBackupTable = backupTableArg ? backupTableArg.split('=')[1] : null;

// ログディレクトリの作成
const logsDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `rollback-${timestamp}.log`);

/**
 * ログを記録
 */
function log(message: string): void {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
}

/**
 * 1. バックアップテーブルの検索
 */
async function findBackupTable(): Promise<string | null> {
  log('📦 バックアップテーブルを検索中...');
  
  if (specifiedBackupTable) {
    log(`   指定されたバックアップテーブル: ${specifiedBackupTable}`);
    return specifiedBackupTable;
  }
  
  try {
    // バックアップテーブルのリストを取得
    const { data, error } = await supabase.rpc('list_backup_tables');
    
    if (error) {
      // RPCが存在しない場合は手動で検索
      log('   ⚠️  list_backup_tables RPC が見つかりません。手動で検索します。');
      
      // information_schema から検索
      const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name LIKE 'property_listings_backup_%'
          ORDER BY table_name DESC
          LIMIT 1;
        `
      });
      
      if (tablesError || !tables || tables.length === 0) {
        log('   ❌ バックアップテーブルが見つかりませんでした');
        return null;
      }
      
      const latestBackup = tables[0].table_name;
      log(`   最新のバックアップテーブル: ${latestBackup}`);
      return latestBackup;
    }
    
    if (!data || data.length === 0) {
      log('   ❌ バックアップテーブルが見つかりませんでした');
      return null;
    }
    
    // 最新のバックアップテーブルを選択
    const latestBackup = data[0].table_name;
    log(`   最新のバックアップテーブル: ${latestBackup}`);
    return latestBackup;
  } catch (error: any) {
    log(`   ❌ バックアップテーブルの検索エラー: ${error.message}`);
    return null;
  }
}

/**
 * 2. バックアップテーブルの検証
 */
async function verifyBackupTable(backupTable: string): Promise<boolean> {
  log('🔍 バックアップテーブルを検証中...');
  
  try {
    // バックアップテーブルのレコード数を確認
    const { count, error } = await supabase
      .from(backupTable)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      log(`   ❌ バックアップテーブルの検証エラー: ${error.message}`);
      return false;
    }
    
    if (!count || count === 0) {
      log('   ⚠️  バックアップテーブルが空です');
      return false;
    }
    
    log(`   ✅ バックアップテーブルに ${count} 件のレコードがあります`);
    return true;
  } catch (error: any) {
    log(`   ❌ バックアップテーブルの検証エラー: ${error.message}`);
    return false;
  }
}

/**
 * 3. 現在のデータのクリア
 */
async function clearCurrentData(): Promise<void> {
  log('🧹 現在のデータをクリア中...');
  
  if (isDryRun) {
    log('   [ドライラン] データクリアをスキップ');
    return;
  }
  
  try {
    // property_listings テーブルのすべてのレコードを削除
    const { error } = await supabase
      .from('property_listings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // すべてのレコードを削除
    
    if (error) {
      throw new Error(`データクリアに失敗しました: ${error.message}`);
    }
    
    log('✅ データクリア完了');
  } catch (error: any) {
    log(`❌ データクリアエラー: ${error.message}`);
    throw error;
  }
}

/**
 * 4. バックアップからのデータ復元
 */
async function restoreFromBackup(backupTable: string): Promise<number> {
  log('📥 バックアップからデータを復元中...');
  
  if (isDryRun) {
    log('   [ドライラン] データ復元をスキップ');
    return 0;
  }
  
  try {
    // バックアップテーブルからデータを取得
    const { data: backupData, error: selectError } = await supabase
      .from(backupTable)
      .select('*');
    
    if (selectError || !backupData) {
      throw new Error(`バックアップデータの取得に失敗しました: ${selectError?.message}`);
    }
    
    const totalCount = backupData.length;
    log(`   ${totalCount} 件のレコードを復元中...`);
    
    // バッチサイズ
    const batchSize = 100;
    let restoredCount = 0;
    
    // バッチ処理でデータを挿入
    for (let i = 0; i < backupData.length; i += batchSize) {
      const batch = backupData.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('property_listings')
        .insert(batch);
      
      if (insertError) {
        log(`   ⚠️  バッチ ${i / batchSize + 1} の挿入エラー: ${insertError.message}`);
      } else {
        restoredCount += batch.length;
        const progress = Math.min(i + batchSize, totalCount);
        log(`   進捗: ${progress}/${totalCount}`);
      }
      
      // レート制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    log(`✅ データ復元完了 (${restoredCount} 件)`);
    return restoredCount;
  } catch (error: any) {
    log(`❌ データ復元エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 5. 同期状態のクリーンアップ
 */
async function cleanupSyncState(): Promise<void> {
  log('🧹 同期状態をクリーンアップ中...');
  
  if (isDryRun) {
    log('   [ドライラン] クリーンアップをスキップ');
    return;
  }
  
  try {
    // マイグレーション関連の同期状態を削除
    const { error: statesError } = await supabase
      .from('property_listing_sync_states')
      .delete()
      .eq('triggered_by', 'migration-script');
    
    if (statesError) {
      log(`   ⚠️  同期状態のクリーンアップエラー: ${statesError.message}`);
    }
    
    // 関連する同期履歴も削除
    const { error: historyError } = await supabase
      .from('property_listing_sync_history')
      .delete()
      .in('sync_id', 
        supabase
          .from('property_listing_sync_states')
          .select('id')
          .eq('triggered_by', 'migration-script')
      );
    
    if (historyError) {
      log(`   ⚠️  同期履歴のクリーンアップエラー: ${historyError.message}`);
    }
    
    log('✅ クリーンアップ完了');
  } catch (error: any) {
    log(`❌ クリーンアップエラー: ${error.message}`);
  }
}

/**
 * 6. ロールバック検証
 */
async function verifyRollback(): Promise<void> {
  log('🔍 ロールバックを検証中...');
  
  if (isDryRun) {
    log('   [ドライラン] 検証をスキップ');
    return;
  }
  
  try {
    // 復元されたデータの件数を確認
    const { count, error } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      log(`   ⚠️  検証エラー: ${error.message}`);
      return;
    }
    
    log(`   復元されたレコード数: ${count}`);
    log('✅ 検証完了');
  } catch (error: any) {
    log(`❌ 検証エラー: ${error.message}`);
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  log('🔙 ロールバック開始...');
  log(`モード: ${isDryRun ? 'ドライラン' : '本番実行'}`);
  log('');
  
  try {
    // 1. バックアップテーブルの検索
    const backupTable = await findBackupTable();
    
    if (!backupTable) {
      log('');
      log('❌ バックアップテーブルが見つかりませんでした');
      log('   ロールバックを実行できません。');
      log('');
      log('利用可能なバックアップテーブルを確認してください:');
      log('npm run ts-node migrations/check-backup-tables.ts');
      process.exit(1);
    }
    
    log(`📦 バックアップテーブル: ${backupTable}`);
    log('');
    
    // 2. バックアップテーブルの検証
    const isValid = await verifyBackupTable(backupTable);
    
    if (!isValid) {
      log('');
      log('❌ バックアップテーブルの検証に失敗しました');
      log('   ロールバックを実行できません。');
      process.exit(1);
    }
    
    // 確認プロンプト（本番実行の場合）
    if (!isDryRun) {
      log('');
      log('⚠️  警告: この操作は現在のデータをすべて削除し、バックアップから復元します。');
      log('   続行する場合は、Ctrl+C で中断してから以下のコマンドを実行してください:');
      log(`   npm run ts-node migrations/rollback-rest-sync.ts -- --backup-table=${backupTable} --confirm`);
      log('');
      
      // --confirm フラグがない場合は中断
      if (!args.includes('--confirm')) {
        log('❌ --confirm フラグが指定されていないため、ロールバックを中断しました');
        process.exit(0);
      }
    }
    
    // 3. 現在のデータのクリア
    await clearCurrentData();
    
    // 4. バックアップからのデータ復元
    const restoredCount = await restoreFromBackup(backupTable);
    
    // 5. 同期状態のクリーンアップ
    await cleanupSyncState();
    
    // 6. ロールバック検証
    await verifyRollback();
    
    log('');
    log('='.repeat(60));
    log('📊 ロールバック結果');
    log('='.repeat(60));
    log(`復元されたレコード数: ${restoredCount}`);
    log(`バックアップテーブル: ${backupTable}`);
    log('='.repeat(60));
    log('');
    
    if (isDryRun) {
      log('✅ ドライラン完了!');
      log('   本番実行する場合は --dry-run オプションを外して --confirm を追加してください。');
    } else {
      log('✅ ロールバック完了!');
      log('   システムは以前の状態に復元されました。');
    }
    
    log('');
    log(`ログファイル: ${logFile}`);
  } catch (error: any) {
    log('');
    log('❌ ロールバックが失敗しました');
    log(`エラー: ${error.message}`);
    log('');
    log('データベース管理者に連絡して、手動でデータを復元してください。');
    process.exit(1);
  }
}

// スクリプト実行
main().catch(error => {
  console.error('❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});
