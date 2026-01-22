// VARCHAR(50)フィールドを特定
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';
const PROBLEM_ROW = 6; // Processing row 6

async function findVarchar50Field() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const mapper = new BuyerColumnMapper();
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // ヘッダー取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];

  // 問題の行を取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${PROBLEM_ROW}:GZ${PROBLEM_ROW}`,
  });
  const row = dataResponse.data.values?.[0] || [];

  console.log(`\n=== 行 ${PROBLEM_ROW} のVARCHAR(50)フィールド特定 ===\n`);

  // マッピング後のデータを取得
  const mappedData = mapper.mapSpreadsheetToDatabase(headers, row);
  
  console.log(`買主番号: ${mappedData.buyer_number}\n`);

  // 実際にデータベースに挿入を試みて、どのフィールドでエラーが出るか確認
  const testBuyerNumber = `TEST_${Date.now()}`;
  const testData = {
    ...mappedData,
    buyer_number: testBuyerNumber,
    name: mappedData.name || 'Test'
  };

  console.log('データベースへの挿入テスト中...\n');

  const { error } = await supabase
    .from('buyers')
    .insert(testData);

  if (error) {
    console.log('❌ エラー発生:');
    console.log(error.message);
    console.log('');

    // エラーメッセージからフィールド名を抽出
    const match = error.message.match(/column "([^"]+)"/);
    if (match) {
      const problemField = match[1];
      console.log(`🎯 問題のフィールド: ${problemField}`);
      console.log(`   値: ${(testData as any)[problemField]}`);
      console.log(`   長さ: ${String((testData as any)[problemField] || '').length}文字`);
    }
  } else {
    console.log('✅ 挿入成功 - VARCHAR(50)エラーは発生しませんでした');
    // Clean up
    await supabase
      .from('buyers')
      .delete()
      .eq('buyer_number', testBuyerNumber);
  }

  console.log('\n=== すべてのフィールドと長さ ===\n');
  
  // すべてのフィールドを長さ順にソート
  const allFields = Object.entries(testData)
    .filter(([_key, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ({
      field: key,
      length: String(value).length,
      value: String(value).substring(0, 60)
    }))
    .sort((a, b) => b.length - a.length);

  allFields.slice(0, 20).forEach(({ field, length, value }) => {
    const marker = length > 50 ? '⚠️ ' : '   ';
    console.log(`${marker}${field}: ${length}文字`);
    if (length > 50) {
      console.log(`     ${value}${length > 60 ? '...' : ''}`);
    }
  });
}

findVarchar50Field().catch(console.error);
