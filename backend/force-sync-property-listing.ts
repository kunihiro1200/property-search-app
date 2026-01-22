/**
 * 物件リスト手動同期スクリプト
 * 
 * 要件5: 手動同期トリガー機能
 * 
 * 特定の物件番号について、スプレッドシートから最新データを取得し、
 * データベースを強制的に更新します。
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyListingColumnMapper } from './src/services/PropertyListingColumnMapper';

const PROPERTY_NUMBER = process.argv[2];

if (!PROPERTY_NUMBER) {
  console.error('❌ 物件番号を指定してください');
  console.log('\n使用方法:');
  console.log('  npm run sync:property-listing:manual AA4885');
  process.exit(1);
}

interface SyncResult {
  success: boolean;
  propertyNumber: string;
  fieldsUpdated?: string[];
  changes?: Record<string, { old: any; new: any }>;
  error?: string;
}

async function forceSyncPropertyListing(propertyNumber: string): Promise<SyncResult> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log(`\n🔄 手動同期開始: ${propertyNumber}`);
  console.log('=' .repeat(60));

  try {
    // 1. スプレッドシートから最新データを取得
    console.log('\n📊 スプレッドシートから最新データを取得中...');
    
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: '業務リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const allRows = await sheetsClient.readAll();
    const spreadsheetRow = allRows.find((row: any) => {
      const pn = String(row['物件番号'] || '').trim();
      return pn === propertyNumber;
    });

    if (!spreadsheetRow) {
      return {
        success: false,
        propertyNumber,
        error: 'スプレッドシートに物件が見つかりません',
      };
    }

    console.log('✅ スプレッドシートからデータを取得しました');

    // 2. データベースの現在の状態を取得
    console.log('\n📊 データベースの現在の状態を確認中...');
    
    const { data: currentData, error: fetchError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return {
          success: false,
          propertyNumber,
          error: 'データベースに物件が存在しません',
        };
      }
      throw fetchError;
    }

    console.log('✅ データベースの現在の状態を取得しました');

    // 3. スプレッドシートデータをマッピング
    console.log('\n🔄 データをマッピング中...');
    
    const mapper = new PropertyListingColumnMapper();
    const mappedData = mapper.mapSpreadsheetToDatabase(spreadsheetRow);

    // 4. 変更を検出
    console.log('\n🔍 変更を検出中...');
    
    const changes: Record<string, { old: any; new: any }> = {};
    const fieldsToUpdate: any = {};

    for (const [field, newValue] of Object.entries(mappedData)) {
      // メタデータフィールドはスキップ
      if (field === 'created_at' || field === 'updated_at') {
        continue;
      }

      const oldValue = currentData[field];
      const normalizedOld = normalizeValue(oldValue);
      const normalizedNew = normalizeValue(newValue);

      if (normalizedOld !== normalizedNew) {
        changes[field] = {
          old: normalizedOld,
          new: normalizedNew,
        };
        fieldsToUpdate[field] = newValue;
      }
    }

    if (Object.keys(changes).length === 0) {
      console.log('✅ 変更はありません（既に同期済み）');
      return {
        success: true,
        propertyNumber,
        fieldsUpdated: [],
        changes: {},
      };
    }

    console.log(`⚠️  ${Object.keys(changes).length}個のフィールドに変更があります:`);
    for (const [field, change] of Object.entries(changes)) {
      console.log(`   ${field}:`);
      console.log(`     旧: "${change.old}"`);
      console.log(`     新: "${change.new}"`);
    }

    // 5. データベースを更新
    console.log('\n💾 データベースを更新中...');
    
    fieldsToUpdate.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('property_listings')
      .update(fieldsToUpdate)
      .eq('property_number', propertyNumber);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ データベースを更新しました');

    // 6. 結果サマリー
    console.log('\n' + '='.repeat(60));
    console.log('✅ 手動同期完了');
    console.log('='.repeat(60));
    console.log(`物件番号: ${propertyNumber}`);
    console.log(`更新フィールド数: ${Object.keys(changes).length}`);
    console.log(`更新フィールド: ${Object.keys(changes).join(', ')}`);
    console.log('\n');

    return {
      success: true,
      propertyNumber,
      fieldsUpdated: Object.keys(changes),
      changes,
    };

  } catch (error: any) {
    console.error('\n❌ 同期中にエラーが発生しました:', error.message);
    return {
      success: false,
      propertyNumber,
      error: error.message,
    };
  }
}

/**
 * 値を正規化（null, undefined, 空文字列を統一）
 */
function normalizeValue(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
}

// スクリプト実行
if (require.main === module) {
  forceSyncPropertyListing(PROPERTY_NUMBER)
    .then((result) => {
      if (result.success) {
        process.exit(0);
      } else {
        console.error(`\n❌ 同期失敗: ${result.error}`);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('同期失敗:', error);
      process.exit(1);
    });
}

export { forceSyncPropertyListing };
