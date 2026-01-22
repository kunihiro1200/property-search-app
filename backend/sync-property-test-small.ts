import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPropertyTestSmall() {
  console.log('=== Testing Property and Valuation Sync (First 10 Sellers) ===\n');

  // Initialize Google Sheets client
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  // Initialize Column Mapper
  const columnMapper = new ColumnMapper();

  // Get first 10 rows from spreadsheet
  console.log('Fetching first 10 rows from spreadsheet...');
  const allRows = await sheetsClient.readAll();
  const rows = allRows.slice(0, 10);
  console.log(`Processing ${rows.length} rows\n`);

  let updatedSellers = 0;
  let updatedProperties = 0;
  let createdProperties = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const sellerNumber = row['売主番号'];
      if (!sellerNumber) {
        continue;
      }

      console.log(`\nProcessing ${sellerNumber}...`);

      // Get seller from database
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .single();

      if (sellerError || !seller) {
        console.log(`  ⚠️ Seller not found in database`);
        continue;
      }

      // Map seller data (including valuation amounts)
      const sellerData = columnMapper.mapToDatabase(row);
      
      console.log(`  Valuation amounts: ${sellerData.valuation_amount_1}, ${sellerData.valuation_amount_2}, ${sellerData.valuation_amount_3}`);
      
      // Update seller with valuation amounts
      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          valuation_amount_1: sellerData.valuation_amount_1,
          valuation_amount_2: sellerData.valuation_amount_2,
          valuation_amount_3: sellerData.valuation_amount_3,
        })
        .eq('id', seller.id);

      if (updateError) {
        console.error(`  ❌ Error updating seller:`, updateError.message);
        errors++;
        continue;
      }

      updatedSellers++;

      // Extract property data
      const propertyData = columnMapper.extractPropertyData(row, seller.id);
      
      if (propertyData) {
        console.log(`  Property address: ${propertyData.address}`);
        console.log(`  Land area: ${propertyData.land_area}, Building area: ${propertyData.building_area}`);
        
        // Check if property exists
        const { data: existingProperty } = await supabase
          .from('properties')
          .select('id')
          .eq('seller_id', seller.id)
          .single();

        if (existingProperty) {
          // Update existing property
          const { error: propUpdateError } = await supabase
            .from('properties')
            .update({
              land_area: propertyData.land_area,
              building_area: propertyData.building_area,
              build_year: propertyData.build_year,
              floor_plan: propertyData.floor_plan,
              structure: propertyData.structure,
            })
            .eq('id', existingProperty.id);

          if (propUpdateError) {
            console.error(`  ❌ Error updating property:`, propUpdateError.message);
            errors++;
          } else {
            console.log(`  ✅ Property updated`);
            updatedProperties++;
          }
        } else {
          // Create new property
          const { error: propCreateError } = await supabase
            .from('properties')
            .insert(propertyData);

          if (propCreateError) {
            console.error(`  ❌ Error creating property:`, propCreateError.message);
            errors++;
          } else {
            console.log(`  ✅ Property created`);
            createdProperties++;
          }
        }
      } else {
        console.log(`  ℹ️ No property data`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error processing row:`, error.message);
      errors++;
    }
  }

  console.log('\n=== Test Complete ===');
  console.log(`Sellers updated: ${updatedSellers}`);
  console.log(`Properties updated: ${updatedProperties}`);
  console.log(`Properties created: ${createdProperties}`);
  console.log(`Errors: ${errors}`);
}

syncPropertyTestSmall()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
