import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, 'google-service-account.json');

async function check() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 売主リストからAA13314を検索
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!B:CZ', // B列から広範囲を取得
  });

  const rows = response.data.values || [];
  const headers = rows[0];
  
  // 次電日のカラムインデックスを探す
  const nextCallDateIndex = headers.findIndex((h: string) => h && h.includes('次電日'));
  console.log('次電日カラムインデックス:', nextCallDateIndex);
  console.log('次電日カラム名:', headers[nextCallDateIndex]);
  
  // AA13314を探す
  const aa13314Row = rows.find((row: any[]) => row[0] === 'AA13314');
  
  if (aa13314Row) {
    console.log('');
    console.log('=== AA13314 スプレッドシートデータ ===');
    console.log('売主番号:', aa13314Row[0]);
    console.log('次電日（スプレッドシート）:', aa13314Row[nextCallDateIndex]);
    console.log('');
    
    // 関連するカラムも表示
    const statusIndex = headers.findIndex((h: string) => h && h.includes('状況（当社）'));
    const inquiryDateIndex = headers.findIndex((h: string) => h && h.includes('反響日付'));
    
    console.log('状況（当社）:', aa13314Row[statusIndex]);
    console.log('反響日付:', aa13314Row[inquiryDateIndex]);
  } else {
    console.log('AA13314が見つかりません');
  }
}

check();
