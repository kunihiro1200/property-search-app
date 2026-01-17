import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';

dotenv.config();

async function checkAA12903SheetColumns() {
  try {
    console.log('🔍 AA12903のスプレッドシートデータを確認...\n');

    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!,
    });
    
    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();
    const aa12903Row = rows.find((row: any) => row['売主番号'] === 'AA12903');
    
    if (!aa12903Row) {
      console.error('❌ スプレッドシートにAA12903が見つかりません');
      return;
    }
    
    console.log('📊 AA12903の全カラムデータ:');
    console.log(JSON.stringify(aa12903Row, null, 2));
    
    // 土地・建物関連のカラムを探す
    console.log('\n🔍 土地・建物関連のカラム:');
    Object.keys(aa12903Row).forEach(key => {
      if (key.includes('土地') || key.includes('建物') || key.includes('面積')) {
        console.log(`  ${key}:`, aa12903Row[key]);
      }
    });
    
  } catch (err) {
    console.error('❌ エラー:', err);
  }
}

checkAA12903SheetColumns();
