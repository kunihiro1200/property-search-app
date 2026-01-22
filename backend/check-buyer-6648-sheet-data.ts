// 買主6648のスプレッドシートデータを確認
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { google } from 'googleapis';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function main() {
  console.log('=== 買主6648のスプレッドシートデータ確認 ===\n');

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
    
    const buyerNumberIndex = headers.findIndex((h: string) => h === '買主番号');
    const receptionDateIndex = headers.findIndex((h: string) => h === '受付日');
    const nameIndex = headers.findIndex((h: string) => h === '氏名');
    
    console.log(`買主番号カラムインデックス: ${buyerNumberIndex}`);
    console.log(`受付日カラムインデックス: ${receptionDateIndex}`);
    console.log(`氏名カラムインデックス: ${nameIndex}`);

    // 全データを取得して6648を探す
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];

    console.log(`\n全行数: ${rows.length}`);

    // 6648を探す
    const targetBuyers = ['6648', '6671', '6670', '6668', '6667', '6666', '6665', '6664', '6663'];
    
    console.log('\n📋 対象買主のスプレッドシートデータ:\n');
    console.log('行番号 | 買主番号 | 氏名 | 受付日');
    console.log('-------|----------|------|--------');
    
    rows.forEach((row, index) => {
      const buyerNumber = row[buyerNumberIndex] || '';
      if (targetBuyers.includes(buyerNumber)) {
        const name = row[nameIndex] || '(なし)';
        const receptionDate = row[receptionDateIndex] || '(空)';
        console.log(`${index + 2} | ${buyerNumber} | ${name} | ${receptionDate}`);
      }
    });

    // 最新の10件も表示
    console.log('\n📋 最新の10件（スプレッドシート末尾）:\n');
    console.log('行番号 | 買主番号 | 氏名 | 受付日');
    console.log('-------|----------|------|--------');
    
    const lastRows = rows.slice(-10);
    lastRows.forEach((row, index) => {
      const rowNum = rows.length - 10 + index + 2;
      const buyerNumber = row[buyerNumberIndex] || '(なし)';
      const name = row[nameIndex] || '(なし)';
      const receptionDate = row[receptionDateIndex] || '(空)';
      console.log(`${rowNum} | ${buyerNumber} | ${name} | ${receptionDate}`);
    });

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
