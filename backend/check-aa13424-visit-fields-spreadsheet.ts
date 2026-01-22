import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkAA13424VisitFields() {
  console.log('🔍 AA13424のスプレッドシート訪問フィールド確認\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  console.log('✅ Google Sheets認証完了\n');

  // ヘッダー行を取得
  const headers = await sheetsClient.getHeaders();
  console.log('📋 訪問関連カラム名:');
  const visitColumns = headers.filter(h => h.includes('訪問'));
  visitColumns.forEach(col => {
    console.log(`  - "${col}"`);
  });
  console.log();

  // AA13424のデータを取得
  const allData = await sheetsClient.readAll();
  const aa13424Row = allData.find(row => row['売主番号'] === 'AA13424');

  if (!aa13424Row) {
    console.log('❌ AA13424が見つかりません');
    return;
  }

  console.log('📊 AA13424の訪問フィールド:');
  console.log('=====================================');
  
  // 訪問取得日（改行文字を含む）
  const visitAcquisitionDateKey = '訪問取得日\n年/月/日';
  const visitAcquisitionDate = aa13424Row[visitAcquisitionDateKey];
  console.log(`訪問取得日\\n年/月/日: "${visitAcquisitionDate}" (type: ${typeof visitAcquisitionDate})`);
  
  // 訪問日
  const visitDateKey = '訪問日 Y/M/D';
  const visitDate = aa13424Row[visitDateKey];
  console.log(`訪問日 Y/M/D: "${visitDate}" (type: ${typeof visitDate})`);
  
  // 訪問査定取得者
  const visitValuationAcquirerKey = '訪問査定取得者';
  const visitValuationAcquirer = aa13424Row[visitValuationAcquirerKey];
  console.log(`訪問査定取得者: "${visitValuationAcquirer}" (type: ${typeof visitValuationAcquirer})`);
  
  // 営担
  const visitAssigneeKey = '営担';
  const visitAssignee = aa13424Row[visitAssigneeKey];
  console.log(`営担: "${visitAssignee}" (type: ${typeof visitAssignee})`);
  
  console.log('\n🔍 すべての訪問関連フィールド:');
  visitColumns.forEach(col => {
    const value = aa13424Row[col];
    console.log(`  ${col}: "${value}" (${typeof value})`);
  });
  
  console.log('\n✅ 確認完了');
}

checkAA13424VisitFields().catch(console.error);
