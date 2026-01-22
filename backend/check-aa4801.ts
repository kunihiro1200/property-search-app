import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'present' : 'missing');
  console.error('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'present' : 'missing');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAA4801() {
  console.log('=== Checking AA4801 Property Type Mismatch ===\n');

  const sellerNumber = 'AA4801';

  // Check database
  const { data: dbSeller, error: dbError } = await supabase
    .from('sellers')
    .select('*, properties(*)')
    .eq('seller_number', sellerNumber)
    .single();

  if (dbError) {
    console.error('Database error:', dbError);
    return;
  }

  console.log('Database Data:');
  console.log('- Seller Number:', dbSeller.seller_number);
  console.log('- Property Type (DB):', dbSeller.properties?.[0]?.property_type || 'NOT FOUND');
  console.log('- Property ID:', dbSeller.properties?.[0]?.id);

  // Check spreadsheet
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  });
  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();

  const sheetRow = rows.find(row => row['売主番号'] === sellerNumber);

  if (sheetRow) {
    console.log('\nSpreadsheet Data:');
    console.log('- Seller Number:', sheetRow['売主番号']);
    console.log('- Property Type (Sheet):', sheetRow['物件種別']);
    
    console.log('\n=== COMPARISON ===');
    const dbType = dbSeller.properties?.[0]?.property_type;
    const sheetType = sheetRow['物件種別'];
    
    if (dbType !== sheetType) {
      console.log('❌ MISMATCH DETECTED!');
      console.log(`   Database: "${dbType}"`);
      console.log(`   Sheet:    "${sheetType}"`);
    } else {
      console.log('✅ Property types match');
    }
  } else {
    console.log('\n❌ Seller not found in spreadsheet');
  }
}

checkAA4801().catch(console.error);
