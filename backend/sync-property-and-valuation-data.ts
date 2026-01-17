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

async function syncPropertyAndValuationData() {
  console.log('=== Syncing Property and Valuation Data from Spreadsheet ===\n');

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

  // Get all rows from spreadsheet
  console.log('Fetching data from spreadsheet...');
  const rows = await sheetsClient.readAll();
  console.log(`Found ${rows.length} rows in spreadsheet\n`);

  let updatedSellers = 0;
  let updatedProperties = 0;
  let createdProperties = 0;
  let errors = 0;
  let skipped = 0;
  const errorLog: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const sellerNumber = row['売主番号'];
      if (!sellerNumber) {
        skipped++;
        continue;
      }

      // Get seller from database
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .single();

      if (sellerError || !seller) {
        skipped++;
        if ((i + 1) % 100 === 0) {
          console.log(`Progress: ${i + 1}/${rows.length} rows processed (${updatedSellers} updated, ${errors} errors, ${skipped} skipped)`);
        }
        continue;
      }

      // Map seller data (including valuation amounts)
      const sellerData = columnMapper.mapToDatabase(row);
      
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
        const errorMsg = `Error updating seller ${sellerNumber}: ${updateError.message}`;
        console.error(`❌ ${errorMsg}`);
        errorLog.push(errorMsg);
        errors++;
        if ((i + 1) % 100 === 0) {
          console.log(`Progress: ${i + 1}/${rows.length} rows processed (${updatedSellers} updated, ${errors} errors, ${skipped} skipped)`);
        }
        continue;
      }

      updatedSellers++;

      // Extract property data
      const propertyData = columnMapper.extractPropertyData(row, seller.id);
      
      if (propertyData) {
        // Check if property exists (use first() to handle duplicates gracefully)
        const { data: existingProperties } = await supabase
          .from('properties')
          .select('id')
          .eq('seller_id', seller.id)
          .limit(1);
        
        const existingProperty = existingProperties && existingProperties.length > 0 ? existingProperties[0] : null;

        if (existingProperty) {
          // Update existing property
          const { error: propUpdateError } = await supabase
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

          if (propUpdateError) {
            const errorMsg = `Error updating property for ${sellerNumber}: ${propUpdateError.message}`;
            console.error(`❌ ${errorMsg}`);
            errorLog.push(errorMsg);
            errors++;
          } else {
            updatedProperties++;
          }
        } else {
          // Create new property
          const { error: propCreateError } = await supabase
            .from('properties')
            .insert(propertyData);

          if (propCreateError) {
            const errorMsg = `Error creating property for ${sellerNumber}: ${propCreateError.message}`;
            console.error(`❌ ${errorMsg}`);
            errorLog.push(errorMsg);
            errors++;
          } else {
            createdProperties++;
          }
        }
      }

      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${rows.length} rows processed (${updatedSellers} updated, ${errors} errors, ${skipped} skipped)`);
      }
    } catch (error: any) {
      const errorMsg = `Error processing row ${i + 1}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errorLog.push(errorMsg);
      errors++;
      
      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${rows.length} rows processed (${updatedSellers} updated, ${errors} errors, ${skipped} skipped)`);
      }
    }
  }

  console.log('\n=== Sync Complete ===');
  console.log(`Sellers updated: ${updatedSellers}`);
  console.log(`Properties updated: ${updatedProperties}`);
  console.log(`Properties created: ${createdProperties}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  
  if (errorLog.length > 0) {
    console.log('\n=== Error Log (first 20) ===');
    errorLog.slice(0, 20).forEach(err => console.log(err));
    
    // Write full error log to file
    const fs = require('fs');
    const errorLogPath = path.join(__dirname, 'sync-errors.log');
    fs.writeFileSync(errorLogPath, errorLog.join('\n'));
    console.log(`\nFull error log written to: ${errorLogPath}`);
  }


}

syncPropertyAndValuationData()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
