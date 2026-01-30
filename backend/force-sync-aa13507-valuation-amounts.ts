import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function forceSyncAA13507ValuationAmounts() {
  console.log('🔄 Force syncing AA13507 valuation amounts from spreadsheet...\n');

  // 1. スプレッドシートからAA13507のデータを取得
  console.log('📥 Fetching AA13507 from spreadsheet...');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const allRows = await sheetsClient.readAll();
  
  const sheetRow = allRows.find(row => row['売主番号'] === 'AA13507');
  
  if (!sheetRow) {
    console.error('❌ AA13507 not found in spreadsheet');
    return;
  }

  console.log('✅ Found AA13507 in spreadsheet');
  console.log('  査定額1（自動計算）v:', sheetRow['査定額1（自動計算）v']);
  console.log('  査定額2（自動計算）v:', sheetRow['査定額2（自動計算）v']);
  console.log('  査定額3（自動計算）v:', sheetRow['査定額3（自動計算）v']);

  // 2. ColumnMapperでデータベース形式に変換
  console.log('\n🔄 Converting to database format...');
  const columnMapper = new ColumnMapper();
  const dbData = columnMapper.mapToDatabase(sheetRow);

  console.log('  valuation_amount_1:', dbData.valuation_amount_1);
  console.log('  valuation_amount_2:', dbData.valuation_amount_2);
  console.log('  valuation_amount_3:', dbData.valuation_amount_3);

  // 3. データベースを更新
  console.log('\n💾 Updating database...');
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      valuation_amount_1: dbData.valuation_amount_1,
      valuation_amount_2: dbData.valuation_amount_2,
      valuation_amount_3: dbData.valuation_amount_3,
    })
    .eq('seller_number', 'AA13507');

  if (updateError) {
    console.error('❌ Failed to update database:', updateError.message);
    return;
  }

  console.log('✅ Database updated successfully');

  // 4. 確認
  console.log('\n🔍 Verifying update...');
  const { data: updatedSeller, error: selectError } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3')
    .eq('seller_number', 'AA13507')
    .single();

  if (selectError) {
    console.error('❌ Failed to verify:', selectError.message);
    return;
  }

  console.log('✅ Verification successful:');
  console.log('  売主番号:', updatedSeller.seller_number);
  console.log('  査定額1:', updatedSeller.valuation_amount_1);
  console.log('  査定額2:', updatedSeller.valuation_amount_2);
  console.log('  査定額3:', updatedSeller.valuation_amount_3);

  // 5. スプレッドシートの値と比較
  console.log('\n📊 Comparison:');
  const sheetValue1 = parseFloat(sheetRow['査定額1（自動計算）v']) * 10000;
  const sheetValue2 = parseFloat(sheetRow['査定額2（自動計算）v']) * 10000;
  const sheetValue3 = parseFloat(sheetRow['査定額3（自動計算）v']) * 10000;
  
  const match1 = updatedSeller.valuation_amount_1 === sheetValue1;
  const match2 = updatedSeller.valuation_amount_2 === sheetValue2;
  const match3 = updatedSeller.valuation_amount_3 === sheetValue3;

  console.log('  査定額1:', match1 ? '✅ Match' : '❌ Mismatch', `(DB: ${updatedSeller.valuation_amount_1}, Sheet: ${sheetValue1})`);
  console.log('  査定額2:', match2 ? '✅ Match' : '❌ Mismatch', `(DB: ${updatedSeller.valuation_amount_2}, Sheet: ${sheetValue2})`);
  console.log('  査定額3:', match3 ? '✅ Match' : '❌ Mismatch', `(DB: ${updatedSeller.valuation_amount_3}, Sheet: ${sheetValue3})`);

  if (match1 && match2 && match3) {
    console.log('\n🎉 All valuation amounts synced successfully!');
  } else {
    console.log('\n⚠️ Some valuation amounts did not sync correctly');
  }
}

forceSyncAA13507ValuationAmounts().catch(console.error);
