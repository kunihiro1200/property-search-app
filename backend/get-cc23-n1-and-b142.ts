import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { google } from 'googleapis';

dotenv.config();

async function getCC23Cells() {
  try {
    console.log('🔍 CC23のathomeシートからN1とB142を取得中...\n');

    const spreadsheetId = '1qc3M5749lK1b94o8EiHWNrHgDDl_UxKO0SpQLEPOSzk';

    const athomeClient = new GoogleSheetsClient({
      spreadsheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await athomeClient.authenticate();
    const sheets = google.sheets({ version: 'v4', auth: athomeClient.getAuth() });

    // N1セル（パノラマURL）を取得
    console.log('=== N1セル（パノラマURL） ===');
    try {
      const n1Response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'athome!N1',
      });

      const n1Value = n1Response.data.values?.[0]?.[0];
      console.log('値:', n1Value || '(空)');
      console.log('');
    } catch (error: any) {
      console.error('❌ N1取得エラー:', error.message);
      console.log('');
    }

    // B142セル（お気に入り文言 - 戸建て）を取得
    console.log('=== B142セル（お気に入り文言 - 戸建て） ===');
    try {
      const b142Response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'athome!B142',
      });

      const b142Value = b142Response.data.values?.[0]?.[0];
      console.log('値:', b142Value || '(空)');
      console.log('');
    } catch (error: any) {
      console.error('❌ B142取得エラー:', error.message);
      console.log('');
    }

    // 念のため、シート名に末尾スペースがある場合も試す
    console.log('=== シート名 "athome " (末尾スペース) で再試行 ===');
    
    try {
      const n1Response2 = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'athome '!N1",
      });

      const n1Value2 = n1Response2.data.values?.[0]?.[0];
      console.log('N1値:', n1Value2 || '(空)');
    } catch (error: any) {
      console.log('N1: シート名 "athome " では見つかりませんでした');
    }

    try {
      const b142Response2 = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'athome '!B142",
      });

      const b142Value2 = b142Response2.data.values?.[0]?.[0];
      console.log('B142値:', b142Value2 || '(空)');
    } catch (error: any) {
      console.log('B142: シート名 "athome " では見つかりませんでした');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

getCC23Cells();
