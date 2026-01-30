import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13507ValuationAmounts() {
  console.log('🔍 Checking AA13507 valuation amounts...\n');

  // 1. データベースの査定額を確認
  console.log('📊 Database (valuation amounts):');
  const { data: dbSeller, error: dbError } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3, valuation_method')
    .eq('seller_number', 'AA13507')
    .single();

  if (dbError) {
    console.error('❌ Database error:', dbError.message);
  } else if (dbSeller) {
    console.log('  売主番号:', dbSeller.seller_number);
    console.log('  査定額1:', dbSeller.valuation_amount_1);
    console.log('  査定額2:', dbSeller.valuation_amount_2);
    console.log('  査定額3:', dbSeller.valuation_amount_3);
    console.log('  査定方法:', dbSeller.valuation_method);
  } else {
    console.log('  ❌ Not found in database');
  }

  // 2. スプレッドシートの査定額を確認
  console.log('\n📊 Spreadsheet (valuation amounts):');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const allRows = await sheetsClient.readAll();
  
  const sheetRow = allRows.find(row => row['売主番号'] === 'AA13507');
  
  if (sheetRow) {
    console.log('  売主番号:', sheetRow['売主番号']);
    console.log('  査定額1（自動計算）v:', sheetRow['査定額1（自動計算）v']);
    console.log('  査定額2（自動計算）v:', sheetRow['査定額2（自動計算）v']);
    console.log('  査定額3（自動計算）v:', sheetRow['査定額3（自動計算）v']);
    console.log('  査定額1:', sheetRow['査定額1']);
    console.log('  査定額2:', sheetRow['査定額2']);
    console.log('  査定額3:', sheetRow['査定額3']);
    console.log('  査定方法:', sheetRow['査定方法']);
  } else {
    console.log('  ❌ Not found in spreadsheet');
  }

  // 3. 比較
  if (dbSeller && sheetRow) {
    console.log('\n📊 Comparison:');
    console.log('  査定額1: DB =', dbSeller.valuation_amount_1, '| Sheet（自動）=', sheetRow['査定額1（自動計算）v'], '| Sheet（手動）=', sheetRow['査定額1']);
    console.log('  査定額2: DB =', dbSeller.valuation_amount_2, '| Sheet（自動）=', sheetRow['査定額2（自動計算）v'], '| Sheet（手動）=', sheetRow['査定額2']);
    console.log('  査定額3: DB =', dbSeller.valuation_amount_3, '| Sheet（自動）=', sheetRow['査定額3（自動計算）v'], '| Sheet（手動）=', sheetRow['査定額3']);
    console.log('  査定方法: DB =', dbSeller.valuation_method, '| Sheet =', sheetRow['査定方法']);
    
    console.log('\n🔍 Analysis:');
    if (dbSeller.valuation_amount_1 === null && sheetRow['査定額1（自動計算）v']) {
      console.log('  ❌ 査定額1が同期されていない（Sheet: ' + sheetRow['査定額1（自動計算）v'] + ' → DB: null）');
    }
    if (dbSeller.valuation_amount_2 === null && sheetRow['査定額2（自動計算）v']) {
      console.log('  ❌ 査定額2が同期されていない（Sheet: ' + sheetRow['査定額2（自動計算）v'] + ' → DB: null）');
    }
    if (dbSeller.valuation_amount_3 === null && sheetRow['査定額3（自動計算）v']) {
      console.log('  ❌ 査定額3が同期されていない（Sheet: ' + sheetRow['査定額3（自動計算）v'] + ' → DB: null）');
    }
  }
}

checkAA13507ValuationAmounts().catch(console.error);
