/**
 * 物件リスト更新同期 - 特定物件詳細診断スクリプト
 * 
 * 特定の物件番号について、スプレッドシートとデータベースのデータを詳細に比較します。
 * 
 * 実行方法:
 *   npx ts-node backend/diagnose-specific-property-sync.ts <物件番号>
 *   例: npx ts-node backend/diagnose-specific-property-sync.ts AA4885
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyListingColumnMapper } from './src/services/PropertyListingColumnMapper';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込む
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

/**
 * 値を正規化して比較可能にする
 */
function normalizeValue(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
}

async function diagnoseProperty(propertyNumber: string) {
  console.log(`=== ${propertyNumber} 詳細診断 ===\n`);
  
  try {
    // 1. スプレッドシートのデータ取得
    console.log('1. スプレッドシートのデータ取得');
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await sheetsClient.authenticate();
    const allData = await sheetsClient.readAll();
    const sheetRow = allData.find(row => {
      const rowPropertyNumber = String(row['物件番号'] || '').trim();
      return rowPropertyNumber === propertyNumber;
    });
    
    if (!sheetRow) {
      console.log('   ❌ スプレッドシートに存在しません\n');
      console.log('利用可能な物件番号の例:');
      allData.slice(0, 5).forEach(row => {
        const pn = String(row['物件番号'] || '').trim();
        if (pn) {
          console.log(`   - ${pn}`);
        }
      });
      return;
    }
    
    console.log('   ✅ スプレッドシートに存在');
    console.log('   主要フィールド:');
    console.log(`      物件番号: "${sheetRow['物件番号']}"`);
    console.log(`      種別: "${sheetRow['種別'] || ''}"`);
    console.log(`      状況: "${sheetRow['状況'] || ''}"`);
    console.log(`      ATBB状況: "${sheetRow['atbb成約済み/非公開'] || ''}"`);
    console.log(`      所在地: "${sheetRow['所在地'] || ''}"`);
    console.log(`      売買価格: "${sheetRow['売買価格'] || ''}"`);
    console.log(`      保存場所: "${sheetRow['保存場所'] || ''}"`);
    console.log('');
    
    // 2. データベースのデータ取得
    console.log('2. データベースのデータ取得');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: dbData, error: dbError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();
    
    if (dbError || !dbData) {
      console.log('   ❌ データベースに存在しません');
      console.log('      → これは新規物件追加の問題です（このspecの対象外）\n');
      console.log('新規物件の追加については以下を参照:');
      console.log('   .kiro/specs/property-listing-auto-sync/');
      return;
    }
    
    console.log('   ✅ データベースに存在');
    console.log('   主要フィールド:');
    console.log(`      property_number: "${dbData.property_number}"`);
    console.log(`      property_type: "${dbData.property_type || ''}"`);
    console.log(`      status: "${dbData.status || ''}"`);
    console.log(`      atbb_status: "${dbData.atbb_status || ''}"`);
    console.log(`      address: "${dbData.address || ''}"`);
    console.log(`      sales_price: "${dbData.sales_price || ''}"`);
    console.log(`      storage_location: "${dbData.storage_location || ''}"`);
    console.log(`      updated_at: ${dbData.updated_at}`);
    console.log('');
    
    // 3. カラムマッピングの確認
    console.log('3. カラムマッピングの確認');
    const columnMapper = new PropertyListingColumnMapper();
    const mappedData = columnMapper.mapSpreadsheetToDatabase(sheetRow);
    
    console.log('   ✅ マッピング完了');
    console.log(`   マッピングされたフィールド数: ${Object.keys(mappedData).length}`);
    console.log('');
    
    // 4. 差分の検出
    console.log('4. 差分の検出');
    const differences: Array<{
      field: string;
      spreadsheet: any;
      mapped: any;
      database: any;
    }> = [];
    
    // 主要フィールドの比較
    const fieldsToCheck = [
      { db: 'property_type', sheet: '種別' },
      { db: 'status', sheet: '状況' },
      { db: 'atbb_status', sheet: 'atbb成約済み/非公開' },
      { db: 'address', sheet: '所在地' },
      { db: 'sales_price', sheet: '売買価格' },
      { db: 'storage_location', sheet: '保存場所' },
    ];
    
    for (const { db: dbField, sheet: sheetField } of fieldsToCheck) {
      const sheetValue = normalizeValue(sheetRow[sheetField]);
      const mappedValue = normalizeValue(mappedData[dbField]);
      const dbValue = normalizeValue(dbData[dbField]);
      
      if (mappedValue !== dbValue) {
        differences.push({
          field: `${dbField} (${sheetField})`,
          spreadsheet: sheetValue,
          mapped: mappedValue,
          database: dbValue
        });
      }
    }
    
    if (differences.length === 0) {
      console.log('   ✅ 差分なし - データは一致しています\n');
      console.log('この物件はスプレッドシートとDBで完全に一致しています。');
    } else {
      console.log(`   ❌ ${differences.length}個のフィールドに差分が見つかりました:\n`);
      
      for (const diff of differences) {
        console.log(`   ${diff.field}:`);
        console.log(`      スプレッドシート: "${diff.spreadsheet}"`);
        console.log(`      マッピング後: "${diff.mapped}"`);
        console.log(`      データベース: "${diff.database}"`);
        console.log('');
      }
      
      console.log('推奨される対応:');
      console.log('- 自動同期が有効な場合、次回の同期（5分以内）で更新されます');
      console.log('- 手動で即座に更新する場合:');
      console.log('  npx ts-node backend/sync-property-listings-updates.ts\n');
    }
    
    // 5. 同期ログの確認
    console.log('5. この物件の同期履歴');
    const { data: logs } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'property_listing_update')
      .order('started_at', { ascending: false })
      .limit(3);
    
    if (!logs || logs.length === 0) {
      console.log('   ⚠️  同期ログが見つかりません');
      console.log('      自動同期が実行されていない可能性があります');
    } else {
      console.log(`   最近の同期実行: ${logs.length}件`);
      logs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.started_at}`);
        console.log(`      ステータス: ${log.status}`);
        console.log(`      更新件数: ${log.properties_updated || 0}`);
      });
    }
    
  } catch (error: any) {
    console.error('\n❌ 診断エラー:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// コマンドライン引数から物件番号を取得
const propertyNumber = process.argv[2];

if (!propertyNumber) {
  console.error('使用方法: npx ts-node backend/diagnose-specific-property-sync.ts <物件番号>');
  console.error('例: npx ts-node backend/diagnose-specific-property-sync.ts AA4885');
  process.exit(1);
}

diagnoseProperty(propertyNumber)
  .then(() => {
    console.log('\n診断完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 診断エラー:', error.message);
    process.exit(1);
  });
