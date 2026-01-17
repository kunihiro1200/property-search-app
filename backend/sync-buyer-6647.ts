/**
 * 買主6647を個別に同期
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';
import { config } from 'dotenv';

config();

async function syncBuyer6647() {
  console.log('🔄 Syncing buyer 6647...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // スプレッドシートから取得
  console.log('📄 Reading from spreadsheet...');
  const sheetsConfig = {
    spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
    sheetName: '買主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();
  
  const allRows = await sheetsClient.readAll();
  const buyer6647Row = allRows.find((row: any) => row['買主番号'] === '6647' || row['買主番号'] === 6647);
  
  if (!buyer6647Row) {
    console.error('❌ Buyer 6647 not found in spreadsheet');
    console.log('   Total rows found:', allRows.length);
    console.log('   Sample buyer numbers:', allRows.slice(0, 5).map(r => r['買主番号']));
    process.exit(1);
  }

  console.log('✅ Found buyer 6647 in spreadsheet');
  console.log('  Raw data keys:', Object.keys(buyer6647Row).length);

  // カラムマッピング
  const columnMapper = new BuyerColumnMapper();
  
  // オブジェクトからヘッダーと値の配列を作成
  const headers = Object.keys(buyer6647Row);
  const rowArray = Object.values(buyer6647Row);
  
  console.log(`\n📋 Found ${headers.length} columns in spreadsheet`);
  
  const mappedData = columnMapper.mapSpreadsheetToDatabase(headers, rowArray);
  
  console.log('\n📊 Mapped data:', JSON.stringify(mappedData, null, 2));

  // DBに挿入
  console.log('\n💾 Inserting into database...');
  const { data, error } = await supabase
    .from('buyers')
    .insert(mappedData)
    .select()
    .single();

  if (error) {
    console.error('❌ Insert error:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  }

  console.log('✅ Successfully inserted buyer 6647');
  console.log('   ID:', data.id);
  console.log('   Buyer Number:', data.buyer_number);
  console.log('   Name:', data.name);

  console.log('\n🎉 Sync complete!');
  process.exit(0);
}

syncBuyer6647().catch(console.error);
