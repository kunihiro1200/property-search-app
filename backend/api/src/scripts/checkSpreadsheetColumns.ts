// スプレッドシートのカラム名を確認するスクリプト
import dotenv from 'dotenv';
import path from 'path';
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';

// backend/.envを読み込む（backend/api/から2階層上）
dotenv.config({ path: path.resolve(__dirname, '../../../../backend/.env') });
// フォールバック: カレントディレクトリの.env
dotenv.config();

async function checkSpreadsheetColumns() {
  console.log('🔍 スプレッドシートのカラム名を確認中...\n');
  console.log('環境変数:');
  console.log('  PROPERTY_LISTING_SPREADSHEET_ID:', process.env.PROPERTY_LISTING_SPREADSHEET_ID);
  console.log('  PROPERTY_LISTING_SHEET_NAME:', process.env.PROPERTY_LISTING_SHEET_NAME);
  console.log('  GOOGLE_SERVICE_ACCOUNT_KEY_PATH:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
  console.log('');

  // GoogleSheetsClientを初期化（物件リストスプレッドシートを使用）
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  // 認証
  await sheetsClient.authenticate();
  console.log('✅ Google Sheets認証成功\n');

  // 最初の1行を取得してカラム名を確認
  const allData = await sheetsClient.readAll();
  
  if (allData.length === 0) {
    console.log('❌ データが見つかりません');
    process.exit(1);
  }

  const firstRow = allData[0];
  const columnNames = Object.keys(firstRow);

  console.log(`📋 カラム数: ${columnNames.length}\n`);
  console.log('📋 カラム名一覧:');
  columnNames.forEach((name, index) => {
    const value = firstRow[name];
    const displayValue = value ? String(value).substring(0, 30) : '(空)';
    console.log(`  ${index + 1}. "${name}" = ${displayValue}`);
  });

  // 物件番号に関連しそうなカラムを探す
  console.log('\n🔍 物件番号に関連しそうなカラム:');
  const propertyNumberColumns = columnNames.filter(name => 
    name.includes('物件') || name.includes('番号') || name.toLowerCase().includes('property')
  );
  
  if (propertyNumberColumns.length > 0) {
    propertyNumberColumns.forEach(name => {
      console.log(`  - "${name}"`);
    });
  } else {
    console.log('  見つかりませんでした');
  }

  // ATBB状態に関連しそうなカラムを探す
  console.log('\n🔍 ATBB状態に関連しそうなカラム:');
  const statusColumns = columnNames.filter(name => 
    name.includes('ATBB') || name.includes('atbb') || name.includes('状態') || name.includes('ステータス') || name.includes('成約') || name.includes('非公開')
  );
  
  if (statusColumns.length > 0) {
    statusColumns.forEach(name => {
      console.log(`  - "${name}"`);
    });
  } else {
    console.log('  見つかりませんでした');
  }

  // 配信日に関連しそうなカラムを探す（最重要）
  console.log('\n🔍 配信日に関連しそうなカラム（最重要）:');
  const distributionColumns = columnNames.filter(name => 
    name.includes('配信') || name.includes('公開')
  );
  
  if (distributionColumns.length > 0) {
    distributionColumns.forEach(name => {
      const value = firstRow[name];
      const displayValue = value ? String(value).substring(0, 30) : '(空)';
      // 文字コードも出力（括弧の種類を確認するため）
      const charCodes = Array.from(name).map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' ');
      console.log(`  - "${name}" = ${displayValue}`);
      console.log(`    文字コード: ${charCodes}`);
    });
  } else {
    console.log('  見つかりませんでした');
    
    // 全カラム名の文字コードを出力（デバッグ用）
    console.log('\n  全カラム名（デバッグ用）:');
    columnNames.forEach((name, index) => {
      if (name.length > 0) {
        const charCodes = Array.from(name).map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' ');
        console.log(`    ${index + 1}. "${name}" [${charCodes}]`);
      }
    });
  }

  // 最初の3件のデータを表示（確認用）
  console.log('\n📊 最初の3件のデータ（配信日フィールド）:');
  const sampleRows = allData.slice(0, 3);
  sampleRows.forEach((row, index) => {
    const propertyNumber = row['物件番号'] || '(不明)';
    const distKeys = Object.keys(row).filter(k => k.includes('配信') || k.includes('公開'));
    console.log(`  ${index + 1}. 物件番号: ${propertyNumber}`);
    distKeys.forEach(key => {
      console.log(`     "${key}": ${row[key] || '(空)'}`);
    });
  });

  process.exit(0);
}

checkSpreadsheetColumns().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
