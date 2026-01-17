// 受付日カラム（6列目）の詳細確認
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function checkReceptionDateColumn() {
  console.log('=== 受付日カラム（6列目）の詳細確認 ===\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. ヘッダー確認
  console.log('1. ヘッダー確認...');
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A1:Z1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  console.log('最初の10カラムのヘッダー:');
  for (let i = 0; i < Math.min(10, headers.length); i++) {
    console.log(`  ${i + 1}列目 (${String.fromCharCode(65 + i)}): "${headers[i]}"`);
  }

  // 2. 6列目（F列）のデータを取得
  console.log('\n2. F列（6列目）のデータ取得...');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!F2:F20`,
  });
  const columnFData = dataResponse.data.values || [];
  
  console.log('\nF列の最初の10行:');
  for (let i = 0; i < Math.min(10, columnFData.length); i++) {
    const value = columnFData[i]?.[0] || '(空)';
    console.log(`  行${i + 2}: "${value}"`);
  }

  // 3. 買主番号も一緒に取得して対応を確認
  console.log('\n3. 買主番号とF列の対応確認...');
  const combinedResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!E2:F20`,
  });
  const combinedData = combinedResponse.data.values || [];
  
  console.log('\n買主番号とF列の対応:');
  for (let i = 0; i < Math.min(10, combinedData.length); i++) {
    const buyerNumber = combinedData[i]?.[0] || '(空)';
    const fColumn = combinedData[i]?.[1] || '(空)';
    console.log(`  買主番号: ${buyerNumber} -> F列: "${fColumn}"`);
  }

  // 4. データベースの reception_date を確認
  console.log('\n4. データベースの reception_date 確認...');
  const buyerNumbers = combinedData.slice(0, 10).map(row => row[0]).filter(Boolean);
  
  const { data: dbBuyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, reception_date')
    .in('buyer_number', buyerNumbers)
    .order('buyer_number');

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  console.log('\nデータベースの reception_date:');
  for (const buyer of dbBuyers || []) {
    console.log(`  買主番号: ${buyer.buyer_number} -> reception_date: ${buyer.reception_date || '(null)'}`);
  }

  // 5. 比較
  console.log('\n5. スプレッドシートとDBの比較:');
  for (let i = 0; i < Math.min(10, combinedData.length); i++) {
    const buyerNumber = combinedData[i]?.[0];
    const sheetValue = combinedData[i]?.[1] || '';
    const dbBuyer = dbBuyers?.find(b => b.buyer_number === buyerNumber);
    
    if (dbBuyer) {
      const match = sheetValue && dbBuyer.reception_date ? '確認必要' : 
                    !sheetValue && !dbBuyer.reception_date ? '✓ 両方空' : '✗ 不一致';
      console.log(`  ${buyerNumber}: シート="${sheetValue}" DB="${dbBuyer.reception_date || '(null)'}" ${match}`);
    }
  }

  // 6. 統計
  console.log('\n6. 全体統計...');
  const { count: totalCount } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });

  const { count: withReceptionDate } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true })
    .not('reception_date', 'is', null);

  console.log(`  総買主数: ${totalCount}`);
  console.log(`  reception_date が設定されている: ${withReceptionDate}`);
  console.log(`  reception_date が null: ${(totalCount || 0) - (withReceptionDate || 0)}`);
}

checkReceptionDateColumn().catch(console.error);
