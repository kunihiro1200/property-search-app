// スプレッドシートの受付日データを確認
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { google } from 'googleapis';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function main() {
  console.log('=== スプレッドシートの受付日データ確認 ===\n');

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    
    // 受付日カラムのインデックスを探す
    const receptionDateIndex = headers.findIndex((h: string) => h === '受付日');
    const buyerNumberIndex = headers.findIndex((h: string) => h === '買主番号');
    
    console.log(`受付日カラムインデックス: ${receptionDateIndex}`);
    console.log(`買主番号カラムインデックス: ${buyerNumberIndex}`);
    
    if (receptionDateIndex === -1) {
      console.log('❌ 受付日カラムが見つかりません');
      return;
    }

    // 最初の20行のデータを取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ21`,
    });
    const rows = dataResponse.data.values || [];

    console.log('\n📋 最初の20件の受付日データ:\n');
    console.log('買主番号 | 受付日（スプレッドシート）');
    console.log('---------|------------------------');
    
    let withDate = 0;
    let withoutDate = 0;
    
    rows.forEach((row) => {
      const buyerNumber = row[buyerNumberIndex] || '(なし)';
      const receptionDate = row[receptionDateIndex] || '';
      console.log(`${buyerNumber} | ${receptionDate || '(空)'}`);
      
      if (receptionDate && receptionDate.trim()) {
        withDate++;
      } else {
        withoutDate++;
      }
    });

    console.log('\n📊 サンプル統計:');
    console.log(`受付日あり: ${withDate}件`);
    console.log(`受付日なし: ${withoutDate}件`);

    // 全データの受付日カバレッジを確認
    console.log('\n全データの受付日カバレッジを確認中...');
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const allRows = allDataResponse.data.values || [];
    
    let totalWithDate = 0;
    let totalWithoutDate = 0;
    
    allRows.forEach(row => {
      const receptionDate = row[receptionDateIndex] || '';
      if (receptionDate && receptionDate.trim()) {
        totalWithDate++;
      } else {
        totalWithoutDate++;
      }
    });

    console.log('\n📊 全データ統計:');
    console.log(`全行数: ${allRows.length}件`);
    console.log(`受付日あり: ${totalWithDate}件`);
    console.log(`受付日なし: ${totalWithoutDate}件`);
    console.log(`カバレッジ: ${(totalWithDate / allRows.length * 100).toFixed(1)}%`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
