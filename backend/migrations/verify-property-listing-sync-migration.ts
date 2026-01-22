/**
 * マイグレーション前データ整合性チェックスクリプト
 * 
 * 目的: 物件リスト同期システムのマイグレーション前にデータベースの状態を検証
 * 
 * 実行方法:
 * npm run ts-node migrations/verify-property-listing-sync-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数の読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ エラー: SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CheckResult {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details?: any;
}

const results: CheckResult[] = [];

/**
 * チェック結果を追加
 */
function addResult(name: string, status: 'pass' | 'warning' | 'fail', message: string, details?: any) {
  results.push({ name, status, message, details });
}

/**
 * 1. データベース接続チェック
 */
async function checkDatabaseConnection(): Promise<void> {
  console.log('🔍 データベース接続をチェック中...');
  
  try {
    const { error } = await supabase.from('property_listings').select('id').limit(1);
    
    if (error) {
      addResult('データベース接続', 'fail', `接続エラー: ${error.message}`);
    } else {
      addResult('データベース接続', 'pass', '接続成功');
    }
  } catch (error: any) {
    addResult('データベース接続', 'fail', `予期しないエラー: ${error.message}`);
  }
}

/**
 * 2. 同期状態テーブルの存在確認
 */
async function checkSyncStateTables(): Promise<void> {
  console.log('🔍 同期状態テーブルの存在を確認中...');
  
  try {
    // property_listing_sync_states テーブルの確認
    const { error: statesError } = await supabase
      .from('property_listing_sync_states')
      .select('id')
      .limit(1);
    
    if (statesError && statesError.code === 'PGRST116') {
      addResult('同期状態テーブル', 'fail', 'property_listing_sync_states テーブルが存在しません');
    } else if (statesError) {
      addResult('同期状態テーブル', 'warning', `テーブルアクセスエラー: ${statesError.message}`);
    } else {
      addResult('同期状態テーブル', 'pass', 'property_listing_sync_states テーブルが存在します');
    }
    
    // property_listing_sync_history テーブルの確認
    const { error: historyError } = await supabase
      .from('property_listing_sync_history')
      .select('id')
      .limit(1);
    
    if (historyError && historyError.code === 'PGRST116') {
      addResult('同期履歴テーブル', 'fail', 'property_listing_sync_history テーブルが存在しません');
    } else if (historyError) {
      addResult('同期履歴テーブル', 'warning', `テーブルアクセスエラー: ${historyError.message}`);
    } else {
      addResult('同期履歴テーブル', 'pass', 'property_listing_sync_history テーブルが存在します');
    }
  } catch (error: any) {
    addResult('同期状態テーブル', 'fail', `予期しないエラー: ${error.message}`);
  }
}

/**
 * 3. 物件リストの総数確認
 */
async function checkPropertyListingsCount(): Promise<void> {
  console.log('🔍 物件リストの総数を確認中...');
  
  try {
    const { count, error } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      addResult('物件リスト総数', 'fail', `カウントエラー: ${error.message}`);
    } else {
      addResult('物件リスト総数', 'pass', `総数: ${count} 件`, { count });
    }
  } catch (error: any) {
    addResult('物件リスト総数', 'fail', `予期しないエラー: ${error.message}`);
  }
}

/**
 * 4. 重複レコードのチェック
 */
async function checkDuplicateRecords(): Promise<void> {
  console.log('🔍 重複レコードをチェック中...');
  
  try {
    const { data, error } = await supabase.rpc('check_duplicate_property_numbers');
    
    if (error && error.code === '42883') {
      // 関数が存在しない場合は手動でチェック
      const { data: properties, error: selectError } = await supabase
        .from('property_listings')
        .select('property_number');
      
      if (selectError) {
        addResult('重複レコード', 'warning', `チェックできませんでした: ${selectError.message}`);
        return;
      }
      
      const propertyNumbers = properties?.map(p => p.property_number) || [];
      const duplicates = propertyNumbers.filter((num, index) => propertyNumbers.indexOf(num) !== index);
      const uniqueDuplicates = [...new Set(duplicates)];
      
      if (uniqueDuplicates.length > 0) {
        addResult('重複レコード', 'warning', `${uniqueDuplicates.length} 件の重複が見つかりました`, { duplicates: uniqueDuplicates });
      } else {
        addResult('重複レコード', 'pass', '重複レコードはありません');
      }
    } else if (error) {
      addResult('重複レコード', 'warning', `チェックエラー: ${error.message}`);
    } else {
      const duplicateCount = data?.length || 0;
      if (duplicateCount > 0) {
        addResult('重複レコード', 'warning', `${duplicateCount} 件の重複が見つかりました`, { duplicates: data });
      } else {
        addResult('重複レコード', 'pass', '重複レコードはありません');
      }
    }
  } catch (error: any) {
    addResult('重複レコード', 'warning', `予期しないエラー: ${error.message}`);
  }
}

/**
 * 5. 必須フィールドのチェック
 */
async function checkRequiredFields(): Promise<void> {
  console.log('🔍 必須フィールドをチェック中...');
  
  try {
    // property_number が NULL のレコードをチェック
    const { count: nullPropertyNumbers, error: error1 } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .is('property_number', null);
    
    if (error1) {
      addResult('必須フィールド (property_number)', 'warning', `チェックエラー: ${error1.message}`);
    } else if (nullPropertyNumbers && nullPropertyNumbers > 0) {
      addResult('必須フィールド (property_number)', 'fail', `${nullPropertyNumbers} 件のレコードで property_number が NULL です`);
    } else {
      addResult('必須フィールド (property_number)', 'pass', 'すべてのレコードに property_number があります');
    }
    
    // storage_location が NULL のレコードをチェック
    const { count: nullStorageLocations, error: error2 } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .is('storage_location', null);
    
    if (error2) {
      addResult('必須フィールド (storage_location)', 'warning', `チェックエラー: ${error2.message}`);
    } else if (nullStorageLocations && nullStorageLocations > 0) {
      addResult('必須フィールド (storage_location)', 'warning', `${nullStorageLocations} 件のレコードで storage_location が NULL です`);
    } else {
      addResult('必須フィールド (storage_location)', 'pass', 'すべてのレコードに storage_location があります');
    }
  } catch (error: any) {
    addResult('必須フィールド', 'fail', `予期しないエラー: ${error.message}`);
  }
}

/**
 * 6. 最終同期時刻の確認
 */
async function checkLastSyncTime(): Promise<void> {
  console.log('🔍 最終同期時刻を確認中...');
  
  try {
    const { data, error } = await supabase
      .from('property_listings')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .limit(1);
    
    if (error) {
      addResult('最終同期時刻', 'warning', `チェックエラー: ${error.message}`);
    } else if (!data || data.length === 0) {
      addResult('最終同期時刻', 'warning', '同期履歴がありません');
    } else {
      const lastSyncTime = data[0].last_synced_at;
      if (lastSyncTime) {
        const lastSync = new Date(lastSyncTime);
        const now = new Date();
        const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceSync > 24) {
          addResult('最終同期時刻', 'warning', `最終同期から ${Math.floor(hoursSinceSync)} 時間経過しています`, { lastSyncTime });
        } else {
          addResult('最終同期時刻', 'pass', `最終同期: ${lastSyncTime}`, { lastSyncTime });
        }
      } else {
        addResult('最終同期時刻', 'warning', '同期時刻が記録されていません');
      }
    }
  } catch (error: any) {
    addResult('最終同期時刻', 'warning', `予期しないエラー: ${error.message}`);
  }
}

/**
 * 結果を表示
 */
function displayResults(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 データ整合性チェック結果');
  console.log('='.repeat(60) + '\n');
  
  let passCount = 0;
  let warningCount = 0;
  let failCount = 0;
  
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    
    if (result.details) {
      console.log(`   詳細: ${JSON.stringify(result.details, null, 2)}`);
    }
    
    if (result.status === 'pass') passCount++;
    else if (result.status === 'warning') warningCount++;
    else failCount++;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`合格: ${passCount} | 警告: ${warningCount} | 失敗: ${failCount}`);
  console.log('='.repeat(60) + '\n');
  
  if (failCount > 0) {
    console.log('❌ データ整合性チェック: 失敗');
    console.log('   マイグレーションを実行する前に、失敗した項目を修正してください。\n');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('⚠️  データ整合性チェック: 警告あり');
    console.log('   警告を確認してから、マイグレーションを実行してください。\n');
  } else {
    console.log('✅ データ整合性チェック: 合格');
    console.log('   マイグレーションを実行できます。\n');
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  console.log('🔍 物件リスト同期システム マイグレーション前チェック開始...\n');
  
  await checkDatabaseConnection();
  await checkSyncStateTables();
  await checkPropertyListingsCount();
  await checkDuplicateRecords();
  await checkRequiredFields();
  await checkLastSyncTime();
  
  displayResults();
}

// スクリプト実行
main().catch(error => {
  console.error('❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});
