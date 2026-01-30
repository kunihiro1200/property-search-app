import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// column-mapping.jsonを読み込み
const columnMapping = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'src/config/column-mapping.json'), 'utf-8')
);

async function forceSyncAA13508() {
  console.log('🔄 AA13508の全フィールドを強制同期中...\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

  // ヘッダーを取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];

  // B列（売主番号）からAA13508を検索
  const sellerNumberResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!B:B`,
  });
  const sellerNumbers = sellerNumberResponse.data.values || [];
  
  let foundRow = -1;
  for (let i = 0; i < sellerNumbers.length; i++) {
    if (sellerNumbers[i][0] === 'AA13508') {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow === -1) {
    console.log('❌ AA13508がスプレッドシートに見つかりません');
    return;
  }

  console.log(`✅ AA13508が見つかりました: ${foundRow}行目\n`);

  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${foundRow}:${foundRow}`,
  });
  const rowData = dataResponse.data.values?.[0] || [];

  // スプレッドシートのデータをオブジェクトに変換
  const spreadsheetData: any = {};
  headers.forEach((header, index) => {
    spreadsheetData[header] = rowData[index] || null;
  });

  console.log('📋 スプレッドシートから取得したデータ:');
  Object.keys(spreadsheetData).forEach(key => {
    if (spreadsheetData[key]) {
      console.log(`  ${key}: ${spreadsheetData[key]}`);
    }
  });

  // column-mapping.jsonを使用してデータベース用のデータに変換
  const dbData: any = {};
  const mapping = columnMapping.spreadsheetToDatabase;
  const typeConversions = columnMapping.typeConversions;

  Object.keys(mapping).forEach(spreadsheetColumn => {
    const dbColumn = mapping[spreadsheetColumn];
    const value = spreadsheetData[spreadsheetColumn];

    if (value !== null && value !== undefined && value !== '') {
      // 型変換
      if (typeConversions[dbColumn] === 'number') {
        dbData[dbColumn] = parseFloat(value) || null;
        // 査定額は万円→円に変換
        if (dbColumn.startsWith('valuation_amount_')) {
          dbData[dbColumn] = dbData[dbColumn] ? dbData[dbColumn] * 10000 : null;
        }
      } else if (typeConversions[dbColumn] === 'date') {
        // 日付フォーマットを修正（MM/DD → YYYY-MM-DD）
        let dateValue = value;
        if (typeof value === 'string' && value.match(/^\d{1,2}\/\d{1,2}$/)) {
          // MM/DD形式の場合、年を追加
          const inquiryYear = spreadsheetData['反響年'] || new Date().getFullYear();
          const [month, day] = value.split('/');
          dateValue = `${inquiryYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        dbData[dbColumn] = dateValue;
      } else if (typeConversions[dbColumn] === 'datetime') {
        dbData[dbColumn] = value;
      } else {
        dbData[dbColumn] = value;
      }
    }
  });

  console.log('\n📊 データベースに保存するデータ:');
  Object.keys(dbData).forEach(key => {
    console.log(`  ${key}: ${dbData[key]}`);
  });

  // データベースを更新
  const { error } = await supabase
    .from('sellers')
    .update(dbData)
    .eq('seller_number', 'AA13508');

  if (error) {
    console.error('\n❌ データベース更新エラー:', error);
    return;
  }

  console.log('\n✅ AA13508の全フィールドを同期しました！');

  // 確認
  const { data: updatedSeller } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13508')
    .single();

  console.log('\n📋 更新後のデータベースの状態:');
  const importantFields = [
    'seller_number',
    'name',
    'property_address',
    'valuation_amount_1',
    'valuation_amount_2',
    'valuation_amount_3',
    'valuation_method',
    'status',
    'visit_date',
    'visit_assignee',
    'inquiry_site',
    'unreachable_status',
    'comments',
  ];

  importantFields.forEach(field => {
    const value = updatedSeller[field];
    if (value === null || value === undefined) {
      console.log(`  ${field}: ❌ null`);
    } else {
      console.log(`  ${field}: ✅ ${value}`);
    }
  });
}

forceSyncAA13508().catch(console.error);
