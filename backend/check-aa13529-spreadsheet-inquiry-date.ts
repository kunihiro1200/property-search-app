/**
 * AA13529のスプレッドシートの反響日付データを確認するスクリプト
 * 同期後にデータが消える原因を調査
 */
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

async function main() {
  console.log('🔍 AA13529のスプレッドシートデータを確認します...\n');

  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };

  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const allRows = await sheetsClient.readAll();
  
  // AA13529を検索
  const row = allRows.find((r: any) => r['売主番号'] === 'AA13529');
  
  if (!row) {
    console.log('❌ AA13529がスプレッドシートに見つかりません');
    return;
  }

  console.log('📊 AA13529のスプレッドシートデータ:');
  console.log('  売主番号:', row['売主番号']);
  console.log('  反響年:', row['反響年'], `(type: ${typeof row['反響年']})`);
  console.log('  反響日付:', row['反響日付'], `(type: ${typeof row['反響日付']})`);
  console.log('  状況（当社）:', row['状況（当社）']);
  console.log('  次電日:', row['次電日'], `(type: ${typeof row['次電日']})`);
  console.log('  不通:', row['不通']);
  console.log('  営担:', row['営担']);

  // 反響日付がExcelシリアル値かどうか確認
  const inquiryDate = row['反響日付'];
  if (typeof inquiryDate === 'number') {
    console.log('\n📅 反響日付はExcelシリアル値です');
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + inquiryDate * 24 * 60 * 60 * 1000);
    console.log('  変換後の日付:', date.toISOString().split('T')[0]);
  } else if (typeof inquiryDate === 'string' && /^\d+$/.test(inquiryDate)) {
    console.log('\n📅 反響日付は数値文字列です（Excelシリアル値の可能性）');
    const serialNumber = parseInt(inquiryDate, 10);
    if (serialNumber > 30000 && serialNumber < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
      console.log('  変換後の日付:', date.toISOString().split('T')[0]);
    }
  } else {
    console.log('\n📅 反響日付の形式:', inquiryDate);
  }
}

main().catch(console.error);
