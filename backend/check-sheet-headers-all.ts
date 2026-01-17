import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function checkHeaders() {
  console.log('=== スプレッドシートのヘッダーを確認 ===\n');

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`, // ヘッダー行のみ
    });

    const headers = response.data.values?.[0] || [];
    
    console.log(`合計列数: ${headers.length}\n`);
    
    // 重要な列を探す
    const importantColumns = [
      '売主番号',
      '営担',
      '状況（当社）',
      '確度',
      '契約年月 他決は分かった時点',
    ];

    console.log('重要な列の位置:');
    console.log('─'.repeat(60));
    
    importantColumns.forEach(colName => {
      const index = headers.findIndex((h: string) => h === colName);
      if (index !== -1) {
        const colLetter = String.fromCharCode(65 + index);
        console.log(`  ${colName}: 列${colLetter} (インデックス ${index})`);
      } else {
        console.log(`  ${colName}: ❌ 見つかりません`);
      }
    });
    
    console.log('─'.repeat(60));
    
    console.log('\nすべてのヘッダー:');
    headers.forEach((header: string, index: number) => {
      if (index >= 26) {
        // AA, AB, AC...
        const first = Math.floor(index / 26) - 1;
        const second = index % 26;
        const col = String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
        console.log(`  [${index}] ${col}: ${header}`);
      } else {
        console.log(`  [${index}] ${String.fromCharCode(65 + index)}: ${header}`);
      }
    });

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkHeaders();
