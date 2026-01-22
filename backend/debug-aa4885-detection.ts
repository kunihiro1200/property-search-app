// AA4885の変更検出をデバッグ
import { config } from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyListingColumnMapper } from './src/services/PropertyListingColumnMapper';
import { createClient } from '@supabase/supabase-js';

config();

const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const PROPERTY_LIST_SHEET_NAME = '物件';

async function debugAA4885Detection() {
  console.log('🔍 AA4885の変更検出をデバッグ中...\n');
  console.log('='.repeat(80));
  
  try {
    // 1. スプレッドシートからAA4885を取得
    console.log('📥 Step 1: スプレッドシートからAA4885を取得');
    console.log('-'.repeat(80));
    
    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const allData = await sheetsClient.readAll();
    const aa4885Row = allData.find(row => {
      const propertyNumber = String(row['物件番号'] || '').trim();
      return propertyNumber === 'AA4885';
    });
    
    if (!aa4885Row) {
      console.log('❌ AA4885がスプレッドシートに見つかりません');
      return;
    }
    
    console.log('✅ AA4885が見つかりました');
    console.log(`  スプレッドシートの "atbb成約済み/非公開": "${aa4885Row['atbb成約済み/非公開']}"`);
    
    // 2. カラムマッパーでマッピング
    console.log('\n🔄 Step 2: カラムマッパーでマッピング');
    console.log('-'.repeat(80));
    
    const columnMapper = new PropertyListingColumnMapper();
    const mappedData = columnMapper.mapSpreadsheetToDatabase(aa4885Row);
    
    console.log('✅ マッピング完了');
    console.log(`  マッピング後の "atbb_status": "${mappedData.atbb_status}"`);
    
    // 3. データベースからAA4885を取得
    console.log('\n📊 Step 3: データベースからAA4885を取得');
    console.log('-'.repeat(80));
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: dbData, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA4885')
      .single();
    
    if (error || !dbData) {
      console.log('❌ AA4885がデータベースに見つかりません');
      return;
    }
    
    console.log('✅ AA4885が見つかりました');
    console.log(`  データベースの "atbb_status": "${dbData.atbb_status}"`);
    
    // 4. 値の正規化をテスト
    console.log('\n🔍 Step 4: 値の正規化をテスト');
    console.log('-'.repeat(80));
    
    const normalizeValue = (value: any): any => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
      }
      return value;
    };
    
    const normalizedSpreadsheet = normalizeValue(mappedData.atbb_status);
    const normalizedDb = normalizeValue(dbData.atbb_status);
    
    console.log('正規化後の値:');
    console.log(`  スプレッドシート: "${normalizedSpreadsheet}"`);
    console.log(`  データベース: "${normalizedDb}"`);
    console.log(`  一致: ${normalizedSpreadsheet === normalizedDb ? 'はい' : 'いいえ'}`);
    
    // 5. 詳細比較
    console.log('\n📋 Step 5: 詳細比較');
    console.log('-'.repeat(80));
    
    if (normalizedSpreadsheet !== normalizedDb) {
      console.log('✅ 変更が検出されるべきです！');
      console.log('\n🔍 詳細情報:');
      console.log(`  スプレッドシート値の型: ${typeof normalizedSpreadsheet}`);
      console.log(`  データベース値の型: ${typeof normalizedDb}`);
      console.log(`  スプレッドシート値の長さ: ${normalizedSpreadsheet?.length || 0}`);
      console.log(`  データベース値の長さ: ${normalizedDb?.length || 0}`);
      
      // 文字コード比較
      if (normalizedSpreadsheet && normalizedDb) {
        console.log('\n  文字コード比較:');
        console.log(`    スプレッドシート: ${Array.from(normalizedSpreadsheet).map(c => c.charCodeAt(0)).join(', ')}`);
        console.log(`    データベース: ${Array.from(normalizedDb).map(c => c.charCodeAt(0)).join(', ')}`);
      }
    } else {
      console.log('❌ 変更が検出されません（値が同じと判断されています）');
    }
    
    // 6. すべてのフィールドを比較
    console.log('\n📊 Step 6: すべてのフィールドを比較');
    console.log('-'.repeat(80));
    
    const changes: Record<string, { old: any; new: any }> = {};
    
    for (const [dbField, spreadsheetValue] of Object.entries(mappedData)) {
      if (dbField === 'created_at' || dbField === 'updated_at') {
        continue;
      }
      
      const dbValue = dbData[dbField];
      const normalizedSpreadsheetValue = normalizeValue(spreadsheetValue);
      const normalizedDbValue = normalizeValue(dbValue);
      
      if (normalizedSpreadsheetValue !== normalizedDbValue) {
        changes[dbField] = {
          old: normalizedDbValue,
          new: normalizedSpreadsheetValue
        };
      }
    }
    
    console.log(`変更されたフィールド: ${Object.keys(changes).length}件`);
    
    if (Object.keys(changes).length > 0) {
      console.log('\n📋 変更内容:');
      for (const [field, change] of Object.entries(changes)) {
        console.log(`\n  ${field}:`);
        console.log(`    旧: "${change.old}"`);
        console.log(`    新: "${change.new}"`);
      }
    } else {
      console.log('\n❌ 変更が検出されませんでした');
      console.log('💡 これは、マッピングまたは正規化に問題がある可能性があります');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
  }
}

debugAA4885Detection()
  .then(() => {
    console.log('\n✅ デバッグ完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ デバッグエラー:', error);
    process.exit(1);
  });
