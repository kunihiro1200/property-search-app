import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function checkValuationColumns() {
  try {
    console.log('🔍 査定額カラムを確認中...\n');

    // サービスアカウントキーを読み込み
    const serviceAccountPath = path.resolve(__dirname, 'google-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // ヘッダー行（1行目）を取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '売主リスト!1:1',
    });

    const headers = headerResponse.data.values?.[0] || [];
    console.log(`📋 ヘッダー行の総列数: ${headers.length}\n`);

    // 査定額関連のカラムを検索
    console.log('🔍 査定額関連のカラム:\n');
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header && (header.includes('査定額') || header.includes('valuation'))) {
        const columnLetter = String.fromCharCode(65 + i);
        console.log(`   ${columnLetter}列（${i + 1}列目）: ${header}`);
      }
    }

    // AA13508の査定額を確認
    console.log('\n📋 AA13508の査定額データ:\n');
    
    // AA13508は6732行目
    const rowResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '売主リスト!6732:6732',
    });

    const rowData = rowResponse.data.values?.[0] || [];

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header && (header.includes('査定額') || header.includes('valuation'))) {
        const columnLetter = String.fromCharCode(65 + i);
        const value = rowData[i] || '(空)';
        console.log(`   ${columnLetter}列（${header}）: ${value}`);
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkValuationColumns();
