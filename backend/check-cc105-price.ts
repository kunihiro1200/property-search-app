import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.env.localを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function checkCC105Price() {
  console.log('🔍 Checking CC105 price data...\n');

  // 1. データベースから確認
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: dbData, error: dbError } = await supabase
    .from('property_listings')
    .select('property_number, sales_price, listing_price, address, property_type, atbb_status')
    .eq('property_number', 'CC105')
    .single();

  if (dbError) {
    console.error('❌ Database error:', dbError);
  } else if (dbData) {
    console.log('📊 Database data:');
    console.log(`  property_number: ${dbData.property_number}`);
    console.log(`  sales_price: ${dbData.sales_price} (売買価格)`);
    console.log(`  listing_price: ${dbData.listing_price} (売出価格)`);
    console.log(`  address: ${dbData.address}`);
    console.log(`  property_type: ${dbData.property_type}`);
    console.log(`  atbb_status: ${dbData.atbb_status}`);
  } else {
    console.log('❌ CC105 not found in database');
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
  const cc105 = rows.find(row => String(row['物件番号']) === 'CC105');

  if (cc105) {
    console.log('✅ Found CC105 in spreadsheet');
    console.log(`  物件番号: ${cc105['物件番号']}`);
    
    // 価格関連のカラムを全て確認
    const priceColumns = [
      '売買価格',
      '売出価格',
      '価格',
      'listing_price',
      'sales_price',
    ];
    
    console.log('\n📊 Checking all price-related columns:');
    priceColumns.forEach(col => {
      const value = cc105[col];
      if (value !== undefined) {
        console.log(`  ${col}: "${value}" (type: ${typeof value})`);
      }
    });
    
    console.log('\n📋 All non-empty fields:');
    Object.keys(cc105).forEach(key => {
      const value = cc105[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        console.log(`  ${key}: ${value}`);
      }
    });
  } else {
    console.log('❌ CC105 not found in spreadsheet');
  }
}

checkCC105Price().catch(console.error);
