import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA5210() {
  console.log('=== AA5210 反響日付チェック ===\n');

  // 1. DBのデータを確認
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, seller_number, inquiry_date, created_at')
    .eq('seller_number', 'AA5210')
    .single();

  if (error) {
    console.error('DB取得エラー:', error);
    return;
  }

  console.log('【DBのデータ】');
  console.log('  seller_number:', seller.seller_number);
  console.log('  inquiry_date:', seller.inquiry_date);
  console.log('  created_at:', seller.created_at);

  // 2. スプレッドシートのデータを確認
  const auth = new google.auth.GoogleAuth({
    keyFile: 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // AA5210を検索
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!A:Z',
  });

  const rows = response.data.values || [];
  const headers = rows[0];
  
  // 反響日付の列を探す
  const inquiryDateColIndex = headers.findIndex((h: string) => 
    h && (h.includes('反響日付') || h.includes('反響日'))
  );


  console.log('\n【スプレッドシートのヘッダー(最初の20列)】');
  for (let i = 0; i < Math.min(20, headers.length); i++) {
    console.log(`  ${i}: ${headers[i]}`);
  }

  // 管理番号を含む列を探す（より柔軟に）
  const sellerNumberColIdx = headers.findIndex((h: string) => 
    h && (h.includes('管理番号') || h === 'No' || h === 'NO' || h.includes('売主番号'))
  );
  
  console.log('\n  管理番号列:', sellerNumberColIdx, '(' + headers[sellerNumberColIdx] + ')');
  console.log('  反響日付列:', inquiryDateColIndex, '(' + headers[inquiryDateColIndex] + ')');

  // AA5210の行を探す（全列を検索）
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const hasAA5210 = row.some((cell: string) => cell && cell.toString().includes('AA5210'));
    if (hasAA5210) {
      console.log('\n【スプレッドシートのデータ - AA5210】');
      console.log('  行番号:', i + 1);
      console.log('  行データ(最初の15列):');
      for (let j = 0; j < Math.min(15, row.length); j++) {
        console.log(`    ${j} (${headers[j]}): ${row[j]}`);
      }
      break;
    }
  }
}

checkAA5210().catch(console.error);
