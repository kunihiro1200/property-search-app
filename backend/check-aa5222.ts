import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA5222() {
  console.log('=== Checking AA5222 ===\n');

  // Check database
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select(`
      id,
      seller_number,
      valuation_amount_1,
      valuation_amount_2,
      valuation_amount_3
    `)
    .eq('seller_number', 'AA5222')
    .single();

  if (sellerError || !seller) {
    console.log('❌ Seller not found in database');
    return;
  }

  console.log('Database - Seller:', seller);

  // Check property
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  if (propError) {
    console.log('❌ Property not found:', propError.message);
  } else {
    console.log('\nDatabase - Property:');
    console.log('  Address:', property.address);
    console.log('  Type:', property.property_type);
    console.log('  Land Area:', property.land_area);
    console.log('  Building Area:', property.building_area);
    console.log('  Build Year:', property.build_year);
    console.log('  Floor Plan:', property.floor_plan);
  }

  // Check spreadsheet
  console.log('\n=== Checking Spreadsheet ===\n');
  
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const rows = await sheetsClient.readAll();
  const row = rows.find(r => r['売主番号'] === 'AA5222');

  if (!row) {
    console.log('❌ AA5222 not found in spreadsheet');
    return;
  }

  console.log('Spreadsheet data:');
  console.log('  物件所在地:', row['物件所在地']);
  console.log('  種別:', row['種別']);
  console.log('  土（㎡）:', row['土（㎡）']);
  console.log('  建（㎡）:', row['建（㎡）']);
  console.log('  築年:', row['築年']);
  console.log('  間取り:', row['間取り']);
  console.log('  査定額1:', row['査定額1']);
  console.log('  査定額2:', row['査定額2']);
  console.log('  査定額3:', row['査定額3']);
}

checkAA5222()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
