// 買主番号6432をスプレッドシートとDBで確認
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function main() {
  console.log('=== 買主番号6432の調査 ===\n');

  // Supabase接続
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. データベースで確認
  console.log('1. データベースで買主番号6432を検索:');
  const { data: dbBuyer, error: dbError } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number, synced_at')
    .eq('buyer_number', '6432')
    .single();

  if (dbError) {
    console.log('  ✗ データベースに存在しません');
  } else {
    console.log('  ✓ データベースに存在:');
    console.log(`    買主番号: ${dbBuyer.buyer_number}`);
    console.log(`    氏名: ${dbBuyer.name}`);
    console.log(`    物件番号: ${dbBuyer.property_number || '(未設定)'}`);
    console.log(`    同期日時: ${dbBuyer.synced_at}`);
  }
  console.log();

  // 2. スプレッドシートで確認
  console.log('2. スプレッドシートで買主番号6432を検索:');
  
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
  
  const buyerNumberIndex = headers.indexOf('買主番号');
  const propertyNumberIndex = headers.indexOf('物件番号');
  const nameIndex = headers.indexOf('●氏名・会社名');

  console.log(`  買主番号カラム: ${buyerNumberIndex} (${headers[buyerNumberIndex]})`);
  console.log(`  物件番号カラム: ${propertyNumberIndex} (${headers[propertyNumberIndex]})`);
  console.log(`  氏名カラム: ${nameIndex} (${headers[nameIndex]})`);
  console.log();

  // データ取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];

  // 買主番号6432を検索
  let found = false;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    
    if (String(buyerNumber).trim() === '6432') {
      found = true;
      console.log(`  ✓ スプレッドシートに存在（行${i + 2}）:`);
      console.log(`    買主番号: ${buyerNumber}`);
      console.log(`    氏名: ${row[nameIndex] || '(空)'}`);
      console.log(`    物件番号: ${row[propertyNumberIndex] || '(空)'}`);
      break;
    }
  }

  if (!found) {
    console.log('  ✗ スプレッドシートに存在しません');
  }
  console.log();

  // 3. AA6381の買主を確認
  console.log('3. AA6381に紐づく買主をスプレッドシートで検索:');
  const aa6381Buyers: any[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const propertyNumber = row[propertyNumberIndex];
    
    if (String(propertyNumber).trim() === 'AA6381') {
      aa6381Buyers.push({
        row: i + 2,
        buyerNumber: row[buyerNumberIndex],
        name: row[nameIndex],
        propertyNumber: propertyNumber
      });
    }
  }

  console.log(`  AA6381に紐づく買主: ${aa6381Buyers.length}件`);
  aa6381Buyers.forEach((buyer, index) => {
    console.log(`  ${index + 1}. 行${buyer.row}: 買主番号=${buyer.buyerNumber}, 氏名=${buyer.name}`);
  });
  console.log();

  // 4. データベースでAA6381の買主を確認
  console.log('4. データベースでAA6381に紐づく買主を検索:');
  const { data: dbBuyers, error: dbBuyersError } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number')
    .eq('property_number', 'AA6381');

  if (dbBuyersError) {
    console.log('  エラー:', dbBuyersError.message);
  } else {
    console.log(`  データベースのAA6381買主: ${dbBuyers?.length || 0}件`);
    dbBuyers?.forEach((buyer, index) => {
      console.log(`  ${index + 1}. 買主番号=${buyer.buyer_number}, 氏名=${buyer.name}`);
    });
  }
}

main().catch(console.error);
