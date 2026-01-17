import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const BUYER_SHEET_NAME = '買主リスト';

async function checkBuyer6648InSpreadsheet() {
  console.log('=== スプレッドシートで買主6648を確認 ===\n');

  try {
    // サービスアカウントキーを読み込む
    const keyPath = path.join(__dirname, 'google-service-account.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    // 認証
    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // シート全体を取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${BUYER_SHEET_NAME}'!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('データが見つかりません');
      return;
    }

    // ヘッダー行を取得
    const headers = rows[0];
    console.log('ヘッダー:', headers.slice(0, 10).join(', '), '...\n');

    // 買主番号の列インデックスを見つける
    const buyerNumberIndex = headers.findIndex(h => 
      h && (h.includes('買主番号') || h.includes('買主No') || h === 'buyer_number')
    );

    if (buyerNumberIndex === -1) {
      console.log('買主番号の列が見つかりません');
      console.log('利用可能なヘッダー:', headers.slice(0, 20));
      return;
    }

    console.log(`買主番号の列: ${buyerNumberIndex} (${headers[buyerNumberIndex]})\n`);

    // 6647と6648を検索
    const buyers6647 = [];
    const buyers6648 = [];
    const buyers6649 = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const buyerNumber = row[buyerNumberIndex];

      if (buyerNumber === '6647') {
        buyers6647.push({ rowIndex: i + 1, data: row });
      } else if (buyerNumber === '6648') {
        buyers6648.push({ rowIndex: i + 1, data: row });
      } else if (buyerNumber === '6649') {
        buyers6649.push({ rowIndex: i + 1, data: row });
      }
    }

    console.log(`買主6647: ${buyers6647.length}件`);
    buyers6647.forEach(buyer => {
      console.log(`  行${buyer.rowIndex}:`, buyer.data.slice(0, 10).join(' | '));
    });

    console.log(`\n買主6648: ${buyers6648.length}件`);
    buyers6648.forEach(buyer => {
      console.log(`  行${buyer.rowIndex}:`, buyer.data.slice(0, 10).join(' | '));
    });

    console.log(`\n買主6649: ${buyers6649.length}件`);
    buyers6649.forEach(buyer => {
      console.log(`  行${buyer.rowIndex}:`, buyer.data.slice(0, 10).join(' | '));
    });

    // 電話番号09095686931で検索
    const phoneIndex = headers.findIndex(h => 
      h && (h.includes('電話') || h.includes('TEL') || h === 'phone_number')
    );

    if (phoneIndex !== -1) {
      console.log(`\n\n電話番号09095686931での検索:`);
      const buyersByPhone = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const phone = row[phoneIndex];
        if (phone && phone.replace(/[-\s]/g, '') === '09095686931') {
          buyersByPhone.push({ 
            rowIndex: i + 1, 
            buyerNumber: row[buyerNumberIndex],
            data: row 
          });
        }
      }

      console.log(`見つかった件数: ${buyersByPhone.length}`);
      buyersByPhone.forEach(buyer => {
        console.log(`  行${buyer.rowIndex} (買主番号: ${buyer.buyerNumber}):`, buyer.data.slice(0, 10).join(' | '));
      });
    }

  } catch (error) {
    console.error('エラー:', error);
  }
}

checkBuyer6648InSpreadsheet().catch(console.error);
