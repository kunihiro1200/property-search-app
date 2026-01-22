import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMultipleIssues() {
  console.log('=== Checking Multiple Sellers ===\n');

  // Initialize Google Sheets client
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const rows = await sheetsClient.readAll();

  const sellerNumbers = ['AA4630', 'AA10030', 'AA4801'];

  for (const sellerNumber of sellerNumbers) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Seller: ${sellerNumber}`);
    console.log('='.repeat(60));

    // Check database
    const { data: seller } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .eq('seller_number', sellerNumber)
      .single();

    if (!seller) {
      console.log('❌ Seller not found in database');
      continue;
    }

    console.log('✅ Seller found in database');

    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', seller.id)
      .single();

    console.log('\n📊 Database Property Data:');
    if (property) {
      console.log(`   address: ${property.address || 'NULL'}`);
      console.log(`   property_type: ${property.property_type || 'NULL'}`);
      console.log(`   land_area: ${property.land_area || 'NULL'}`);
      console.log(`   building_area: ${property.building_area || 'NULL'}`);
      console.log(`   build_year: ${property.build_year || 'NULL'}`);
      console.log(`   floor_plan: ${property.floor_plan || 'NULL'}`);
      console.log(`   structure: ${property.structure || 'NULL'}`);
    } else {
      console.log('   ❌ No property record exists');
    }

    // Check spreadsheet
    const row = rows.find(r => r['売主番号'] === sellerNumber);

    console.log('\n📋 Spreadsheet Data:');
    if (row) {
      console.log(`   物件所在地: ${row['物件所在地'] || '(empty)'}`);
      console.log(`   物件種別: ${row['物件種別'] || '(empty)'}`);
      console.log(`   土（㎡）: ${row['土（㎡）'] || '(empty)'}`);
      console.log(`   建（㎡）: ${row['建（㎡）'] || '(empty)'}`);
      console.log(`   築年: ${row['築年'] || '(empty)'}`);
      console.log(`   間取り: ${row['間取り'] || '(empty)'}`);
      console.log(`   構造: ${row['構造'] || '(empty)'}`);
      
      // Check for issues
      console.log('\n🔍 Issues Detected:');
      let hasIssues = false;

      if (!property) {
        console.log('   ❌ Property record missing in database');
        hasIssues = true;
      } else {
        if (row['物件所在地'] && property.address !== row['物件所在地']) {
          console.log(`   ❌ Address mismatch:`);
          console.log(`      Sheet: ${row['物件所在地']}`);
          console.log(`      DB: ${property.address}`);
          hasIssues = true;
        }

        if (row['物件種別'] && property.property_type !== row['物件種別']) {
          console.log(`   ❌ Property type mismatch:`);
          console.log(`      Sheet: ${row['物件種別']}`);
          console.log(`      DB: ${property.property_type}`);
          hasIssues = true;
        }

        if (row['土（㎡）'] && !property.land_area) {
          console.log(`   ❌ Land area missing in DB (Sheet has: ${row['土（㎡）']})`);
          hasIssues = true;
        }

        if (row['建（㎡）'] && !property.building_area) {
          console.log(`   ❌ Building area missing in DB (Sheet has: ${row['建（㎡）']})`);
          hasIssues = true;
        }

        if (row['築年'] && !property.build_year) {
          console.log(`   ❌ Build year missing in DB (Sheet has: ${row['築年']})`);
          hasIssues = true;
        }

        if (row['間取り'] && !property.floor_plan) {
          console.log(`   ❌ Floor plan missing in DB (Sheet has: ${row['間取り']})`);
          hasIssues = true;
        }
      }

      if (!hasIssues) {
        console.log('   ✅ No issues detected');
      }
    } else {
      console.log('   ❌ Not found in spreadsheet');
    }
  }
}

checkMultipleIssues()
  .then(() => {
    console.log('\n\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
