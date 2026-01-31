import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env' });

async function check() {
  const credentials = JSON.parse(fs.readFileSync('google-service-account.json', 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  // 売主リストからAA9112を検索
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B:CZ',
  });
  
  const rows = response.data.values || [];
  const headers = rows[0];
  
  // AA9112を探す
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'AA9112') {
      console.log('=== AA9112 スプレッドシートデータ ===');
      console.log('行番号:', i + 1);
      
      // 重要なカラムを表示
      const importantCols = ['売主番号', '名前', '物件所在地', '種別', '状況（当社）'];
      for (const col of importantCols) {
        const idx = headers.indexOf(col);
        if (idx !== -1) {
          console.log(`${col}: ${rows[i][idx] || '(空)'}`);
        }
      }
      
      // 物件所在地のインデックスを確認
      const propertyAddressIdx = headers.indexOf('物件所在地');
      console.log('\n物件所在地のカラムインデックス:', propertyAddressIdx);
      console.log('物件所在地の値:', rows[i][propertyAddressIdx] || '(空)');
      
      break;
    }
  }
}

check();
