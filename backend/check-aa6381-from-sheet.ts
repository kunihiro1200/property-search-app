// スプレッドシートからAA6381の買主データを確認
import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function checkAA6381FromSheet() {
  console.log('=== スプレッドシートからAA6381の買主を確認 ===\n');

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
  console.log(`ヘッダー数: ${headers.length}`);
  
  // ヘッダーの一部を表示
  console.log('\n=== ヘッダーサンプル（最初の10個） ===');
  headers.slice(0, 10).forEach((h, i) => {
    console.log(`  [${i}] ${h}`);
  });
  console.log();

  // 物件番号カラムのインデックスを確認
  const propertyNumberIndex = headers.indexOf('物件番号');
  const buyerNumberIndex = headers.indexOf('買主番号');
  const nameIndex = headers.indexOf('●氏名・会社名');
  const phoneIndex = headers.indexOf('●電話番号\n（ハイフン不要）');
  
  console.log(`物件番号カラムのインデックス: ${propertyNumberIndex}`);
  console.log(`買主番号カラムのインデックス: ${buyerNumberIndex}`);
  console.log(`氏名カラムのインデックス: ${nameIndex}`);
  console.log(`電話番号カラムのインデックス: ${phoneIndex}`);
  
  if (propertyNumberIndex === -1) {
    console.log('✗ 物件番号カラムが見つかりません');
    return;
  }

  // 全データ取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];
  console.log(`総行数: ${rows.length}\n`);

  // AA6381を含む行を検索
  const aa6381Rows: any[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const propertyNumber = row[propertyNumberIndex];
    
    if (propertyNumber && String(propertyNumber).includes('6381')) {
      aa6381Rows.push({
        rowNumber: i + 2,
        propertyNumber: propertyNumber,
        buyerNumber: row[buyerNumberIndex] || '',
        name: row[nameIndex] || '',
        phone: row[phoneIndex] || ''
      });
    }
  }

  console.log(`AA6381を含む行: ${aa6381Rows.length}件\n`);

  if (aa6381Rows.length > 0) {
    console.log('買主リスト:');
    aa6381Rows.forEach(buyer => {
      console.log(`  行${buyer.rowNumber}: ${buyer.buyerNumber} - ${buyer.name}`);
      console.log(`    物件番号: "${buyer.propertyNumber}"`);
      console.log(`    電話番号: ${buyer.phone}`);
      console.log('  ---');
    });
  } else {
    console.log('✗ AA6381の買主が見つかりませんでした');
    
    // サンプルデータを表示
    console.log('\n=== サンプルデータ（最初の5行） ===');
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      const propertyNumber = row[propertyNumberIndex];
      const buyerNumber = row[buyerNumberIndex] || '';
      
      console.log(`行${i + 2}: 買主番号=${buyerNumber}, 物件番号="${propertyNumber}"`);
    }
  }
}

checkAA6381FromSheet().then(() => {
  console.log('\n完了');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
