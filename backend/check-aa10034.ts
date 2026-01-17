import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
  const sellerNumber = 'AA10034';

  console.log(`=== Checking ${sellerNumber} ===\n`);

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: path.join(__dirname, 'google-service-account.json'),
  });

  await sheetsClient.authenticate();

  try {
    // Check database
    const { data: seller, error: dbError } = await supabase
      .from('sellers')
      .select(`
        id,
        seller_number,
        properties (
          id,
          property_type
        )
      `)
      .eq('seller_number', sellerNumber)
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      process.exit(1);
    }

    console.log('DATABASE:');
    console.log('  Seller ID:', seller.id);
    console.log('  Seller Number:', seller.seller_number);
    if (seller.properties && seller.properties.length > 0) {
      const property = Array.isArray(seller.properties) 
        ? seller.properties[0] 
        : seller.properties;
      console.log('  Property ID:', property.id);
      console.log('  Property Type:', JSON.stringify(property.property_type));
      console.log('  Property Type (raw):', property.property_type);
    } else {
      console.log('  No property found');
    }
    console.log('');

    // Check spreadsheet
    const sheetRows = await sheetsClient.readAll();
    const sheetRow = sheetRows.find(
      row => String(row['売主番号']) === sellerNumber
    );

    console.log('SPREADSHEET:');
    if (sheetRow) {
      console.log('  種別:', JSON.stringify(sheetRow['種別']));
      console.log('  種別 (raw):', sheetRow['種別']);
    } else {
      console.log('  Not found in spreadsheet');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
