import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA4630() {
  console.log('=== Checking AA4630 ===\n');

  // Check database
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, seller_number')
    .eq('seller_number', 'AA4630')
    .single();

  if (!seller) {
    console.log('❌ Seller AA4630 not found in database');
    return;
  }

  console.log('✅ Seller found in database');
  console.log(`   ID: ${seller.id}`);

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  console.log('\nDatabase Property Data:');
  if (property) {
    console.log(`   land_area: ${property.land_area || 'NULL'}`);
    console.log(`   building_area: ${property.building_area || 'NULL'}`);
    console.log(`   build_year: ${property.build_year || 'NULL'}`);
    console.log(`   floor_plan: ${property.floor_plan || 'NULL'}`);
    console.log(`   structure: ${property.structure || 'NULL'}`);
    console.log(`   address: ${property.address || 'NULL'}`);
  } else {
    console.log('   (No property record)');
  }

  // Check spreadsheet
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const rows = await sheetsClient.readAll();
  const row = rows.find(r => r['売主番号'] === 'AA4630');

  console.log('\nSpreadsheet Data:');
  if (row) {
    console.log(`   物件所在地: ${row['物件所在地'] || '(empty)'}`);
    console.log(`   土（㎡）: ${row['土（㎡）'] || '(empty)'}`);
    console.log(`   建（㎡）: ${row['建（㎡）'] || '(empty)'}`);
    console.log(`   築年: ${row['築年'] || '(empty)'}`);
    console.log(`   間取り: ${row['間取り'] || '(empty)'}`);
    console.log(`   構造: ${row['構造'] || '(empty)'}`);
  } else {
    console.log('   (Not found in spreadsheet)');
  }
}

checkAA4630()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
