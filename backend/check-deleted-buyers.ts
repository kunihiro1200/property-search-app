import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkDeletedBuyers() {
  console.log('=== スプレッドシートとデータベースの差分確認 ===\n');

  // スプレッドシートから買主番号を取得
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  });

  await sheetsClient.authenticate();

  // スプレッドシートから全データを取得（E列：買主番号）
  const sheetName = process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト';
  const range = `${sheetName}!E5:E`;

  const response = await sheetsClient.sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
    range: range,
  });

  const rows = response.data.values || [];
  const sheetBuyerNumbers = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0] || row[0].trim() === '') {
      continue;
    }
    const value = row[0].trim();
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      sheetBuyerNumbers.add(value);
    }
  }

  console.log(`スプレッドシートの買主数: ${sheetBuyerNumbers.size}`);

  // データベースから買主番号を取得
  const { data: dbBuyers, error } = await supabase
    .from('buyers')
    .select('buyer_number')
    .order('buyer_number', { ascending: true });

  if (error) {
    console.error('データベースエラー:', error);
    return;
  }

  console.log(`データベースの買主数: ${dbBuyers?.length || 0}\n`);

  // データベースにあるがスプレッドシートにない買主を検出
  const toDelete: string[] = [];
  
  for (const buyer of dbBuyers || []) {
    if (!sheetBuyerNumbers.has(buyer.buyer_number)) {
      toDelete.push(buyer.buyer_number);
    }
  }

  if (toDelete.length === 0) {
    console.log('✅ 削除対象の買主はありません');
  } else {
    console.log(`⚠️ 削除対象の買主: ${toDelete.length}件\n`);
    console.log('削除対象の買主番号:');
    toDelete.forEach(num => console.log(`  - ${num}`));
  }
}

checkDeletedBuyers().catch(console.error);
