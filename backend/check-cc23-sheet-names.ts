import dotenv from 'dotenv';
import { google } from 'googleapis';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkSheetNames() {
  try {
    console.log('🔍 CC23スプレッドシートのシート名を確認中...\n');

    const spreadsheetId = '1qc3M5749lK1b94o8EiHWNrHgDDl_UxKO0SpQLEPOSzk';

    // 認証
    const tempClient = new GoogleSheetsClient({
      spreadsheetId: spreadsheetId,
      sheetName: 'dummy',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await tempClient.authenticate();
    const sheets = google.sheets({ version: 'v4', auth: tempClient.getAuth() });

    // スプレッドシートのメタデータを取得
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    console.log('=== シート一覧 ===');
    console.log('');

    response.data.sheets?.forEach((sheet, index) => {
      const title = sheet.properties?.title || '';
      const sheetId = sheet.properties?.sheetId || '';
      
      console.log(`${index + 1}. シート名: "${title}"`);
      console.log(`   シートID: ${sheetId}`);
      console.log(`   文字数: ${title.length}`);
      console.log(`   前後の空白チェック:`);
      console.log(`     - 先頭の空白: ${title.startsWith(' ') ? 'あり' : 'なし'}`);
      console.log(`     - 末尾の空白: ${title.endsWith(' ') ? 'あり' : 'なし'}`);
      console.log(`   トリム後: "${title.trim()}"`);
      console.log('');
    });

    // athomeシートを探す
    const athomeSheet = response.data.sheets?.find(sheet => 
      sheet.properties?.title?.trim().toLowerCase() === 'athome'
    );

    if (athomeSheet) {
      const exactName = athomeSheet.properties?.title || '';
      console.log('✅ athomeシートが見つかりました');
      console.log(`正確なシート名: "${exactName}"`);
      console.log('');

      // 正確なシート名でデータを取得
      console.log('=== データ取得テスト ===');
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `'${exactName}'!A1:B10`,
      });

      const data = dataResponse.data.values || [];
      console.log(`取得行数: ${data.length}`);
      data.forEach((row, index) => {
        console.log(`行${index + 1}: ${row[0] || ''} | ${row[1] || ''}`);
      });
    } else {
      console.log('❌ athomeシートが見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

checkSheetNames();
