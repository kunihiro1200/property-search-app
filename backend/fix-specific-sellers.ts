import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSpecificSellers() {
  console.log('=== Fixing Specific Sellers ===\n');

  const sellerNumbers = ['AA4630', 'AA10030', 'AA4801'];

  // Initialize Google Sheets client
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const columnMapper = new ColumnMapper();

  const rows = await sheetsClient.readAll();

  for (const sellerNumber of sellerNumbers) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${sellerNumber}`);
    console.log('='.repeat(60));

    // Get seller from database
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('seller_number', sellerNumber)
      .single();

    if (!seller) {
      console.log('❌ Seller not found in database');
      continue;
    }

    // Get row from spreadsheet
    const row = rows.find(r => r['売主番号'] === sellerNumber);
    if (!row) {
      console.log('❌ Seller not found in spreadsheet');
      continue;
    }

    // Extract property data
    const propertyData = columnMapper.extractPropertyData(row, seller.id);

    if (!propertyData) {
      console.log('⚠️  No property data in spreadsheet');
      continue;
    }

    console.log('\n📋 Property data from spreadsheet:');
    console.log(`   address: ${propertyData.address}`);
    console.log(`   property_type: ${propertyData.property_type || 'NULL'}`);
    console.log(`   land_area: ${propertyData.land_area || 'NULL'}`);
    console.log(`   building_area: ${propertyData.building_area || 'NULL'}`);
    console.log(`   build_year: ${propertyData.build_year || 'NULL'}`);
    console.log(`   floor_plan: ${propertyData.floor_plan || 'NULL'}`);

    // Check if property exists
    const { data: existingProperty } = await supabase
      .from('properties')
      .select('id')
      .eq('seller_id', seller.id)
      .single();

    if (existingProperty) {
      console.log('\n✏️  Updating existing property...');
      const { error } = await supabase
        .from('properties')
        .update({
          address: propertyData.address,
          property_type: propertyData.property_type,
          land_area: propertyData.land_area,
          building_area: propertyData.building_area,
          build_year: propertyData.build_year,
          floor_plan: propertyData.floor_plan,
          structure: propertyData.structure,
          seller_situation: propertyData.seller_situation,
          land_rights: propertyData.land_rights,
          current_status: propertyData.current_status,
        })
        .eq('id', existingProperty.id);

      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log('✅ Property updated successfully');
      }
    } else {
      console.log('\n➕ Creating new property...');
      const { error } = await supabase
        .from('properties')
        .insert(propertyData);

      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log('✅ Property created successfully');
      }
    }
  }
}

fixSpecificSellers()
  .then(() => {
    console.log('\n\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
