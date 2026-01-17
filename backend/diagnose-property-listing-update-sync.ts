/**
 * 物件リスト更新同期 - 全体診断スクリプト
 * 
 * 既存物件データの更新がスプレッドシートからデータベースに同期されているかを診断します。
 * 
 * 実行方法:
 *   npx ts-node backend/diagnose-property-listing-update-sync.ts
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込む
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

async function diagnose() {
  console.log('=== 物件リスト更新同期 診断 ===\n');
  
  // 1. 環境変数の確認
  console.log('1. 環境変数の確認');
  console.log(`   AUTO_SYNC_ENABLED: ${process.env.AUTO_SYNC_ENABLED || '未設定'}`);
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '設定済み' : '未設定'}`);
  console.log(`   SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定'}`);
  console.log(`   GOOGLE_SHEETS_SPREADSHEET_ID: ${process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? '設定済み' : '未設定'}`);
  console.log('');
  
  // 2. sync_logsテーブルの確認
  console.log('2. 同期ログの確認');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: logs, error: logsError } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'property_listing_update')
    .order('started_at', { ascending: false })
    .limit(5);
  
  if (logsError) {
    console.log(`   ⚠️  sync_logsテーブルの読み込みエラー: ${logsError.message}`);
  } else if (!logs || logs.length === 0) {
    console.log('   ❌ 同期ログが見つかりません');
    console.log('      → 自動同期が一度も実行されていない可能性があります');
  } else {
    console.log(`   ✅ 同期ログ: ${logs.length}件`);
    console.log(`      最終実行: ${logs[0].started_at}`);
    console.log(`      ステータス: ${logs[0].status}`);
    if (logs[0].properties_updated !== undefined) {
      console.log(`      更新件数: ${logs[0].properties_updated}`);
    }
    if (logs[0].properties_failed !== undefined && logs[0].properties_failed > 0) {
      console.log(`      失敗件数: ${logs[0].properties_failed}`);
    }
  }
  console.log('');
  
  // 3. スプレッドシートとDBの差分確認（最新10件）
  console.log('3. データ差分の確認（最新10件）');
  
  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await sheetsClient.authenticate();
    const sheetData = await sheetsClient.readAll();
    
    // 最新10件をチェック
    const recentProperties = sheetData.slice(0, 10);
    let mismatchCount = 0;
    
    for (const row of recentProperties) {
      const propertyNumber = String(row['物件番号'] || '').trim();
      if (!propertyNumber) continue;
      
      const { data: dbData, error: dbError } = await supabase
        .from('property_listings')
        .select('atbb_status, status, sales_price, updated_at')
        .eq('property_number', propertyNumber)
        .single();
      
      if (dbError || !dbData) {
        console.log(`   ⚠️  ${propertyNumber}: DBに存在しません（新規物件の可能性）`);
        continue;
      }
      
      // 主要フィールドの比較
      const sheetAtbb = String(row['atbb成約済み/非公開'] || '').trim();
      const dbAtbb = String(dbData.atbb_status || '').trim();
      
      const sheetStatus = String(row['状況'] || '').trim();
      const dbStatus = String(dbData.status || '').trim();
      
      const sheetPrice = String(row['売買価格'] || '').trim();
      const dbPrice = String(dbData.sales_price || '').trim();
      
      const hasMismatch = sheetAtbb !== dbAtbb || sheetStatus !== dbStatus || sheetPrice !== dbPrice;
      
      if (hasMismatch) {
        mismatchCount++;
        console.log(`   ⚠️  ${propertyNumber}: データ不一致`);
        
        if (sheetAtbb !== dbAtbb) {
          console.log(`      ATBB状況: スプレッドシート="${sheetAtbb}" / DB="${dbAtbb}"`);
        }
        if (sheetStatus !== dbStatus) {
          console.log(`      状況: スプレッドシート="${sheetStatus}" / DB="${dbStatus}"`);
        }
        if (sheetPrice !== dbPrice) {
          console.log(`      売買価格: スプレッドシート="${sheetPrice}" / DB="${dbPrice}"`);
        }
        console.log(`      最終更新: ${dbData.updated_at}`);
      }
    }
    
    if (mismatchCount === 0) {
      console.log('   ✅ 最新10件は全て一致しています');
    } else {
      console.log(`   ❌ ${mismatchCount}件の不一致が見つかりました`);
    }
  } catch (error: any) {
    console.log(`   ❌ スプレッドシート読み込みエラー: ${error.message}`);
  }
  console.log('');
  
  // 4. 診断結果のサマリー
  console.log('=== 診断結果サマリー ===\n');
  
  if (!logs || logs.length === 0) {
    console.log('❌ 自動同期が実行されていません\n');
    console.log('推奨される対応:');
    console.log('1. バックエンドサーバーを再起動してください');
    console.log('   cd backend && npm run dev\n');
    console.log('2. 起動ログで以下を確認してください:');
    console.log('   ✅ EnhancedAutoSyncService initialized');
    console.log('   📊 Enhanced periodic auto-sync enabled\n');
  } else {
    const lastSync = new Date(logs[0].started_at);
    const now = new Date();
    const minutesSinceLastSync = Math.floor((now.getTime() - lastSync.getTime()) / 60000);
    
    if (minutesSinceLastSync > 10) {
      console.log(`⚠️  最後の同期から${minutesSinceLastSync}分経過しています`);
      console.log('   通常は5分ごとに実行されるはずです\n');
      console.log('推奨される対応:');
      console.log('- バックエンドサーバーが正常に動作しているか確認してください');
      console.log('- AUTO_SYNC_ENABLED環境変数がtrueに設定されているか確認してください\n');
    } else {
      console.log('✅ 自動同期は正常に動作しています');
      console.log(`   最後の同期: ${minutesSinceLastSync}分前\n`);
    }
    
    // データ不一致がある場合
    const mismatchCount = parseInt(process.env.MISMATCH_COUNT || '0');
    if (mismatchCount > 0) {
      console.log(`⚠️  ${mismatchCount}件のデータ不一致があります`);
      console.log('   次回の自動同期（5分以内）で更新される予定です\n');
      console.log('手動で即座に更新する場合:');
      console.log('   npx ts-node backend/sync-property-listings-updates.ts\n');
    }
  }
  
  console.log('詳細診断:');
  console.log('特定の物件について詳細に診断する場合:');
  console.log('   npx ts-node backend/diagnose-specific-property-sync.ts <物件番号>');
  console.log('   例: npx ts-node backend/diagnose-specific-property-sync.ts AA4885\n');
}

diagnose()
  .then(() => {
    console.log('診断完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 診断エラー:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
    process.exit(1);
  });
