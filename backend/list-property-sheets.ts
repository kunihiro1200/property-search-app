import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';

async function listSheets() {
  console.log('📋 スプレッドシートのシート一覧を取得中...\n');

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetList = response.data.sheets;
    if (!sheetList || sheetList.length === 0) {
      console.log('❌ シートが見つかりません');
      return;
    }

    console.log(`✅ ${sheetList.length}個のシートが見つかりました:\n`);
    sheetList.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.properties?.title}`);
    });

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

listSheets();
