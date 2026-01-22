import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function getGoogleSheetsClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const absolutePath = path.resolve(__dirname, keyPath);
  const credentials = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  return google.sheets({ version: 'v4', auth });
}

function parseDetailedDatetime(value: string): Date | null {
  if (!value || value.trim() === '') return null;
  
  // 2025/11/30 15:30:01 形式
  const match1 = value.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (match1) {
    const [, year, month, day, hour, minute, second] = match1;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      second ? parseInt(second) : 0
    );
  }
  
  // 2025-11-30 15:30:01 形式
  const match2 = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (match2) {
    const [, year, month, day, hour, minute, second] = match2;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      second ? parseInt(second) : 0
    );
  }
  
  // 2025/11/30 15:30 形式（秒なし）
  const match3 = value.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (match3) {
    const [, year, month, day, hour, minute] = match3;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      0
    );
  }
  
  return null;
}

async function syncAllDetailedDatetime() {
  console.log('=== 全売主の反響詳細日時を同期 ===\n');

  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];

  const detailedDatetimeIndex = headers.findIndex((h: string) => h === '反響詳細日時');
  const sellerNumberIndex = headers.findIndex((h: string) => h === '売主番号');
  
  console.log('反響詳細日時 column index:', detailedDatetimeIndex);
  console.log('売主番号 column index:', sellerNumberIndex);

  if (detailedDatetimeIndex === -1) {
    console.error('反響詳細日時 column not found!');
    return;
  }

  // 全データを取得
  console.log('\nFetching spreadsheet data...');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:AZ`,
  });
  const rows = dataResponse.data.values || [];
  console.log(`Total rows: ${rows.length}`);

  // 反響詳細日時があるデータを収集
  const updates: { sellerNumber: string; detailedDatetime: string }[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberIndex];
    const detailedDatetime = row[detailedDatetimeIndex];
    
    if (sellerNumber && detailedDatetime) {
      const parsed = parseDetailedDatetime(detailedDatetime);
      if (parsed && !isNaN(parsed.getTime())) {
        updates.push({
          sellerNumber,
          detailedDatetime: parsed.toISOString(),
        });
      }
    }
  }

  console.log(`\nFound ${updates.length} sellers with 反響詳細日時 data`);

  // バッチで更新
  let successCount = 0;
  let errorCount = 0;
  
  for (const update of updates) {
    const { error } = await supabase
      .from('sellers')
      .update({ inquiry_detailed_datetime: update.detailedDatetime })
      .eq('seller_number', update.sellerNumber);
    
    if (error) {
      errorCount++;
      if (errorCount <= 5) {
        console.error(`Error updating ${update.sellerNumber}:`, error.message);
      }
    } else {
      successCount++;
    }
    
    // 進捗表示
    if ((successCount + errorCount) % 100 === 0) {
      console.log(`Progress: ${successCount + errorCount}/${updates.length}`);
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

syncAllDetailedDatetime().catch(console.error);
