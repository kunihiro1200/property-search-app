/**
 * スプレッドシートとDBの買主数を比較
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { config } from 'dotenv';

config();

async function checkBuyerCountComparison() {
  console.log('🔍 Comparing buyer counts between spreadsheet and database...\n');

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
  
  // 買主番号がある行のみカウント
  const validRows = allRows.filter((row: any) => {
    const buyerNumber = row['買主番号'];
    return buyerNumber && String(buyerNumber).trim() !== '';
  });
  
  console.log(`✅ Spreadsheet: ${validRows.length} buyers with valid buyer numbers`);
  console.log(`   Total rows: ${allRows.length}`);

  // DBから取得
  console.log('\n💾 Reading from database...');
  const { count: dbCount, error } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Database: ${dbCount} buyers`);

  // 差分を計算
  const difference = validRows.length - (dbCount || 0);
  console.log(`\n📊 Difference: ${difference} buyers not synced`);
  
  if (difference > 0) {
    console.log(`\n⚠️  ${difference} buyers from spreadsheet are missing in the database`);
    
    // サンプルの買主番号を表示
    const buyerNumbers = validRows.map((row: any) => row['買主番号']).slice(0, 10);
    console.log('\n📋 Sample buyer numbers from spreadsheet:');
    buyerNumbers.forEach((num: any) => console.log(`   - ${num}`));
  } else if (difference < 0) {
    console.log(`\n⚠️  Database has ${Math.abs(difference)} more buyers than spreadsheet`);
  } else {
    console.log('\n✅ Counts match!');
  }

  console.log('\n🎉 Check complete!');
  process.exit(0);
}

checkBuyerCountComparison().catch(console.error);
