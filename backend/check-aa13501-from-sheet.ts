import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// 環境変数を読み込む（.env.localを優先）
dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkAA13501() {
  console.log('🔍 Checking AA13501 data from spreadsheet...\n');
  
  // 環境変数を確認
  console.log('📋 Environment variables:');
  console.log('  GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
  console.log('  GOOGLE_SHEETS_SHEET_NAME:', process.env.GOOGLE_SHEETS_SHEET_NAME);
  console.log('');
  
  if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    console.log('❌ GOOGLE_SHEETS_SPREADSHEET_ID is not set');
    return;
  }
  
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト'
  });
  
  await sheetsClient.initialize();
  
  // 全データを取得
  const rows = await sheetsClient.readAll();
  
  // AA13501を検索
  const aa13501Row = rows.find(row => row['物件番号'] === 'AA13501');
  
  if (!aa13501Row) {
    console.log('❌ AA13501 not found in spreadsheet');
    return;
  }
  
  console.log('✅ AA13501 found in spreadsheet\n');
  console.log('📋 Spreadsheet data:');
  console.log('  物件番号:', aa13501Row['物件番号']);
  console.log('  不通:', aa13501Row['不通']);
  console.log('  物件所在地:', aa13501Row['物件所在地']);
  console.log('  コメント:', aa13501Row['コメント']);
  console.log('\n📋 All available columns:');
  Object.keys(aa13501Row).forEach(key => {
    if (aa13501Row[key]) {
      console.log(`  ${key}: ${aa13501Row[key]}`);
    }
  });
}

checkAA13501().catch(console.error);
