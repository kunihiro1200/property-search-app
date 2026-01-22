/**
 * AA13241の存在確認スクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13241() {
  console.log('=== AA13241 存在確認 ===\n');

  // DBから確認
  const { data: dbSeller, error: dbError } = await supabase
    .from('sellers')
    .select('id, seller_number, site, inquiry_date, status')
    .eq('seller_number', 'AA13241')
    .maybeSingle();

  console.log('📊 DBの状態:');
  if (dbError) {
    console.log(`  エラー: ${dbError.message}`);
  } else if (dbSeller) {
    console.log(`  存在: はい`);
    console.log(`  ID: ${dbSeller.id}`);
    console.log(`  売主番号: ${dbSeller.seller_number}`);
    console.log(`  サイト: ${dbSeller.site || '(空)'}`);
    console.log(`  反響日付: ${dbSeller.inquiry_date}`);
    console.log(`  状況: ${dbSeller.status}`);
  } else {
    console.log(`  存在: いいえ`);
  }

  // スプレッドシートから確認
  try {
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const allRows = await sheetsClient.readAll();
    
    const sheetRow = allRows.find((r: any) => r['売主番号'] === 'AA13241');
    
    console.log('\n📋 スプレッドシートの状態:');
    if (sheetRow) {
      console.log(`  存在: はい`);
      console.log(`  売主番号: ${sheetRow['売主番号']}`);
      console.log(`  サイト: ${sheetRow['サイト'] || '(空)'}`);
      console.log(`  反響日付: ${sheetRow['反響日付'] || '(空)'}`);
      console.log(`  状況: ${sheetRow['状況（当社）'] || '(空)'}`);
    } else {
      console.log(`  存在: いいえ`);
    }

    // AA13240〜AA13250の範囲を確認
    console.log('\n📋 AA13240〜AA13250の範囲確認:');
    for (let i = 13240; i <= 13250; i++) {
      const sellerNumber = `AA${i}`;
      const row = allRows.find((r: any) => r['売主番号'] === sellerNumber);
      const inDb = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .maybeSingle();
      
      const sheetStatus = row ? '✅' : '❌';
      const dbStatus = inDb.data ? '✅' : '❌';
      console.log(`  ${sellerNumber}: スプシ=${sheetStatus}, DB=${dbStatus}`);
    }

  } catch (error: any) {
    console.log(`\n📋 スプレッドシート確認エラー: ${error.message}`);
  }
}

checkAA13241().catch(console.error);
