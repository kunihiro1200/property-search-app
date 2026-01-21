import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { google } from 'googleapis';

dotenv.config();

async function checkAthomeSheetStructure() {
  try {
    console.log('🔍 CC23のathomeシート構造を確認中...\n');

    // 業務リストから情報を取得
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await gyomuListClient.authenticate();
    const gyomuData = await gyomuListClient.readAll();

    const cc23Row = gyomuData.find(row => row['物件番号'] === 'CC23');
    if (!cc23Row) {
      console.error('❌ 業務リストにCC23が見つかりません');
      return;
    }

    const spreadsheetUrl = cc23Row['スプシURL'];
    const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch) {
      console.error('❌ スプレッドシートIDを抽出できません');
      return;
    }

    const individualSpreadsheetId = spreadsheetIdMatch[1];
    console.log('個別スプレッドシートID:', individualSpreadsheetId);
    console.log('');

    // athomeシートの最初の100行を取得
    const athomeClient = new GoogleSheetsClient({
      spreadsheetId: individualSpreadsheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await athomeClient.authenticate();
    const sheets = google.sheets({ version: 'v4', auth: athomeClient.getAuth() });

    // A列とB列の最初の200行を取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: individualSpreadsheetId,
      range: 'athome!A1:B200',
    });

    const data = response.data.values || [];

    console.log('=== athomeシートの構造（A列とB列の最初の200行） ===');
    console.log('');

    data.forEach((row, index) => {
      const rowNum = index + 1;
      const colA = row[0] || '';
      const colB = row[1] || '';
      
      // 重要そうな行だけ表示
      if (colA.includes('お気に入り') || 
          colA.includes('パノラマ') || 
          colB.includes('お気に入り') || 
          colB.includes('パノラマ') ||
          colA.includes('URL') ||
          colB.includes('URL')) {
        console.log(`行${rowNum}: A="${colA}" | B="${colB}"`);
      }
    });

    console.log('');
    console.log('=== 全行表示（最初の30行） ===');
    data.slice(0, 30).forEach((row, index) => {
      const rowNum = index + 1;
      const colA = row[0] || '';
      const colB = row[1] || '';
      console.log(`行${rowNum}: A="${colA.substring(0, 40)}" | B="${colB.substring(0, 40)}"`);
    });

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

checkAthomeSheetStructure();
