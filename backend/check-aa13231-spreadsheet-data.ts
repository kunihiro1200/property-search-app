/**
 * スプレッドシートからAA13231のデータを確認
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkAA13231SpreadsheetData() {
  console.log('🔍 Checking AA13231 in spreadsheet...\n');

  try {
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    console.log('✅ Connected to Google Sheets\n');

    // 全データを取得
    const allRows = await sheetsClient.readAll();
    console.log(`📊 Total rows in spreadsheet: ${allRows.length}\n`);

    // AA13231を検索
    const aa13231Row = allRows.find(row => row['売主番号'] === 'AA13231');
    
    if (!aa13231Row) {
      console.log('❌ AA13231 not found in spreadsheet');
      return;
    }

    console.log('✅ AA13231 found in spreadsheet:\n');
    
    // 重要なフィールドを表示
    const importantFields = [
      '売主番号',
      '売主名',
      'ステータス',
      '契約年月 他決は分かった時点',
      '訪問担当',
      '訪問日',
      '訪問獲得日',
      '専任契約日',
      '専任契約終了日',
      '一般契約日',
      '一般契約終了日',
    ];

    for (const field of importantFields) {
      const value = aa13231Row[field];
      console.log(`   ${field}: ${value !== undefined && value !== null && value !== '' ? value : '(空欄)'}`);
    }

    console.log('\n📋 All fields:');
    const allFields = Object.keys(aa13231Row).sort();
    for (const field of allFields) {
      const value = aa13231Row[field];
      if (value !== undefined && value !== null && value !== '') {
        console.log(`   ${field}: ${value}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkAA13231SpreadsheetData().catch(console.error);
