import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseMissingPropertyData() {
  console.log('=== Diagnosing Missing Property Data ===\n');

  // Initialize Google Sheets client
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  console.log('Fetching data from spreadsheet...');
  const rows = await sheetsClient.readAll();
  console.log(`Found ${rows.length} rows in spreadsheet\n`);

  // Find sellers with property data in spreadsheet but NULL in database
  const missingDataCases: any[] = [];
  let checked = 0;
  let hasSheetData = 0;
  let hasDbData = 0;
  let missingInDb = 0;

  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i];
    const sellerNumber = row['売主番号'];
    
    if (!sellerNumber) continue;
    
    checked++;

    // Check if spreadsheet has property data
    const landArea = row['土（㎡）'];
    const buildingArea = row['建（㎡）'];
    const buildYear = row['築年'];
    const floorPlan = row['間取り'];
    
    const hasPropertyDataInSheet = landArea || buildingArea || buildYear || floorPlan;
    
    if (hasPropertyDataInSheet) {
      hasSheetData++;
      
      // Check database
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .single();

      if (seller) {
        const { data: property } = await supabase
          .from('properties')
          .select('land_area, building_area, build_year, floor_plan')
          .eq('seller_id', seller.id)
          .single();

        if (property) {
          const hasPropertyDataInDb = property.land_area || property.building_area || property.build_year || property.floor_plan;
          
          if (hasPropertyDataInDb) {
            hasDbData++;
          } else {
            missingInDb++;
            missingDataCases.push({
              sellerNumber,
              sheetData: {
                landArea,
                buildingArea,
                buildYear,
                floorPlan,
              },
              dbData: property,
            });
          }
        } else {
          missingInDb++;
          missingDataCases.push({
            sellerNumber,
            sheetData: {
              landArea,
              buildingArea,
              buildYear,
              floorPlan,
            },
            dbData: null,
          });
        }
      }
    }

    if ((i + 1) % 20 === 0) {
      console.log(`Progress: ${i + 1}/100 rows checked`);
    }
  }

  console.log('\n=== Diagnosis Results (First 100 Rows) ===');
  console.log(`Rows checked: ${checked}`);
  console.log(`Rows with property data in spreadsheet: ${hasSheetData}`);
  console.log(`Rows with property data in database: ${hasDbData}`);
  console.log(`Rows missing in database: ${missingInDb}`);
  console.log(`Missing rate: ${((missingInDb / hasSheetData) * 100).toFixed(1)}%`);

  if (missingDataCases.length > 0) {
    console.log('\n=== Sample Missing Cases (First 10) ===');
    missingDataCases.slice(0, 10).forEach((case_, idx) => {
      console.log(`\n${idx + 1}. Seller Number: ${case_.sellerNumber}`);
      console.log('   Spreadsheet Data:');
      console.log(`     土（㎡）: ${case_.sheetData.landArea || '(empty)'}`);
      console.log(`     建（㎡）: ${case_.sheetData.buildingArea || '(empty)'}`);
      console.log(`     築年: ${case_.sheetData.buildYear || '(empty)'}`);
      console.log(`     間取り: ${case_.sheetData.floorPlan || '(empty)'}`);
      console.log('   Database Data:');
      if (case_.dbData) {
        console.log(`     land_area: ${case_.dbData.land_area || 'NULL'}`);
        console.log(`     building_area: ${case_.dbData.building_area || 'NULL'}`);
        console.log(`     build_year: ${case_.dbData.build_year || 'NULL'}`);
        console.log(`     floor_plan: ${case_.dbData.floor_plan || 'NULL'}`);
      } else {
        console.log('     (No property record)');
      }
    });
  }
}

diagnoseMissingPropertyData()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
