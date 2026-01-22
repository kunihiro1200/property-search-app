import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check2026DatesFromSheet() {
  console.log('=== 2026年データのスプレッドシート確認 ===\n');

  // スプレッドシートからデータを取得
  const auth = new google.auth.GoogleAuth({
    keyFile: 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!A:Z',
  });

  const rows = response.data.values || [];
  const headers = rows[0];
  
  // 列インデックスを取得
  const sellerNumberColIdx = headers.findIndex((h: string) => h && h.includes('売主番号'));
  const inquiryYearColIdx = headers.findIndex((h: string) => h && h === '反響年');
  const inquiryDateColIdx = headers.findIndex((h: string) => h && h === '反響日付');

  console.log('列インデックス:');
  console.log('  売主番号:', sellerNumberColIdx);
  console.log('  反響年:', inquiryYearColIdx);
  console.log('  反響日付:', inquiryDateColIdx);
  console.log('');

  // 2026年のデータをDBから取得
  const { data: sellers2026 } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date')
    .gte('inquiry_date', '2026-01-01')
    .lte('inquiry_date', '2026-12-31')
    .limit(50);

  if (!sellers2026 || sellers2026.length === 0) {
    console.log('2026年のデータはありません');
    return;
  }

  console.log(`2026年のデータ: ${sellers2026.length}件\n`);

  // スプレッドシートで各売主のデータを確認
  const sellerNumbers = sellers2026.map((s: any) => s.seller_number);
  
  for (const sellerNumber of sellerNumbers.slice(0, 10)) {
    // スプレッドシートで検索
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[sellerNumberColIdx] === sellerNumber) {
        const sheetYear = row[inquiryYearColIdx];
        const sheetDate = row[inquiryDateColIdx];
        const dbSeller = sellers2026.find((s: any) => s.seller_number === sellerNumber);
        
        console.log(`${sellerNumber}:`);
        console.log(`  DB: ${dbSeller?.inquiry_date}`);
        console.log(`  シート: 反響年=${sheetYear}, 反響日付=${sheetDate}`);
        console.log('');
        break;
      }
    }
  }
}

check2026DatesFromSheet().catch(console.error);
