import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAA12398() {
  console.log('🔍 Checking AA12398 atbb_status...\n');

  // 1. データベースから確認
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: dbData, error: dbError } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, address, property_type, sales_price')
    .eq('property_number', 'AA12398')
    .single();

  if (dbError) {
    console.error('❌ Database error:', dbError);
  } else if (dbData) {
    console.log('📊 Database data:');
    console.log(`  property_number: ${dbData.property_number}`);
    console.log(`  atbb_status: "${dbData.atbb_status}" (length: ${dbData.atbb_status?.length || 0})`);
    console.log(`  address: ${dbData.address}`);
    console.log(`  property_type: ${dbData.property_type}`);
    console.log(`  sales_price: ${dbData.sales_price}`);
  } else {
    console.log('❌ AA12398 not found in database');
  }

  // 2. スプレッドシートから確認
  console.log('\n📋 Checking spreadsheet data...');
  
  const config = {
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: './google-service-account.json',
  };

  const client = new GoogleSheetsClient(config);
  await client.authenticate();

  const rows = await client.readAll();
  const aa12398 = rows.find(row => String(row['物件番号']) === 'AA12398');

  if (aa12398) {
    console.log('✅ Found AA12398 in spreadsheet');
    console.log(`  物件番号: ${aa12398['物件番号']}`);
    
    // atbb_statusの候補カラムを全て確認
    const atbbStatusCandidates = [
      'atbb_status',
      'ATBB_status',
      'ステータス',
      'atbb成約済み/非公開',
    ];
    
    console.log('\n📊 Checking all atbb_status candidate columns:');
    atbbStatusCandidates.forEach(col => {
      const value = aa12398[col];
      console.log(`  ${col}: "${value}" (type: ${typeof value}, length: ${String(value || '').length})`);
    });
    
    console.log('\n📋 All non-empty fields:');
    Object.keys(aa12398).forEach(key => {
      const value = aa12398[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        console.log(`  ${key}: ${value}`);
      }
    });
  } else {
    console.log('❌ AA12398 not found in spreadsheet');
  }
}

checkAA12398().catch(console.error);
