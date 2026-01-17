// 物件スプレッドシートのヘッダーを確認するスクリプト
import { google } from 'googleapis';
import * as path from 'path';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '物件';

async function checkPropertySheetHeaders() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー行を取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });

    const headers = headerResponse.data.values?.[0] || [];
    console.log(`\n=== 物件シートのヘッダー (${headers.length}カラム) ===\n`);
    
    headers.forEach((header, index) => {
      console.log(`${index + 1}. ${header}`);
    });

    // データ行数を確認
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rowCount = (dataResponse.data.values?.length || 1) - 1;
    console.log(`\n=== データ行数: ${rowCount}行 ===\n`);

    // 最初の数行のサンプルデータを取得
    const sampleResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:E6`,
    });

    console.log('=== サンプルデータ (最初の5行、最初の5カラム) ===');
    sampleResponse.data.values?.forEach((row, index) => {
      console.log(`Row ${index + 2}:`, row);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPropertySheetHeaders();
