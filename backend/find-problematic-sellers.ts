import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findProblematicSellers() {
  console.log('=== Finding Sellers with Missing Property Data ===\n');

  // Get all properties with NULL fields
  const { data: propertiesWithNulls, error } = await supabase
    .from('properties')
    .select('id, seller_id, land_area, building_area, build_year, floor_plan')
    .or('land_area.is.null,building_area.is.null,build_year.is.null,floor_plan.is.null')
    .limit(50);

  if (error) {
    console.error('Error fetching properties:', error);
    return;
  }

  console.log(`Found ${propertiesWithNulls?.length || 0} properties with NULL fields\n`);

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

  // Create a map of seller_number to sheet data
  const sheetDataMap = new Map();
  rows.forEach(row => {
    const sellerNumber = row['売主番号'];
    if (sellerNumber) {
      sheetDataMap.set(sellerNumber, {
        landArea: row['土（㎡）'],
        buildingArea: row['建（㎡）'],
        buildYear: row['築年'],
        floorPlan: row['間取り'],
        address: row['物件所在地'],
      });
    }
  });

  console.log('Checking properties against spreadsheet data...\n');

  const problematicCases: any[] = [];

  for (const property of propertiesWithNulls || []) {
    // Get seller number
    const { data: seller } = await supabase
      .from('sellers')
      .select('seller_number')
      .eq('id', property.seller_id)
      .single();

    if (!seller) continue;

    const sheetData = sheetDataMap.get(seller.seller_number);
    
    if (sheetData) {
      // Check if spreadsheet has data that's missing in DB
      const hasSheetData = sheetData.landArea || sheetData.buildingArea || sheetData.buildYear || sheetData.floorPlan;
      
      if (hasSheetData) {
        problematicCases.push({
          sellerNumber: seller.seller_number,
          sheetData,
          dbData: {
            land_area: property.land_area,
            building_area: property.building_area,
            build_year: property.build_year,
            floor_plan: property.floor_plan,
          },
        });
      }
    }
  }

  console.log(`\n=== Found ${problematicCases.length} Problematic Cases ===\n`);

  if (problematicCases.length > 0) {
    console.log('Sample cases (first 10):\n');
    problematicCases.slice(0, 10).forEach((case_, idx) => {
      console.log(`${idx + 1}. Seller Number: ${case_.sellerNumber}`);
      console.log('   Spreadsheet:');
      console.log(`     物件所在地: ${case_.sheetData.address || '(empty)'}`);
      console.log(`     土（㎡）: ${case_.sheetData.landArea || '(empty)'}`);
      console.log(`     建（㎡）: ${case_.sheetData.buildingArea || '(empty)'}`);
      console.log(`     築年: ${case_.sheetData.buildYear || '(empty)'}`);
      console.log(`     間取り: ${case_.sheetData.floorPlan || '(empty)'}`);
      console.log('   Database:');
      console.log(`     land_area: ${case_.dbData.land_area || 'NULL'}`);
      console.log(`     building_area: ${case_.dbData.building_area || 'NULL'}`);
      console.log(`     build_year: ${case_.dbData.build_year || 'NULL'}`);
      console.log(`     floor_plan: ${case_.dbData.floor_plan || 'NULL'}`);
      console.log('');
    });

    // Analyze patterns
    console.log('\n=== Pattern Analysis ===');
    let allFieldsNull = 0;
    let someFieldsNull = 0;
    let hasAddress = 0;

    problematicCases.forEach(case_ => {
      const nullCount = [
        case_.dbData.land_area,
        case_.dbData.building_area,
        case_.dbData.build_year,
        case_.dbData.floor_plan,
      ].filter(v => v === null).length;

      if (nullCount === 4) {
        allFieldsNull++;
      } else {
        someFieldsNull++;
      }

      if (case_.sheetData.address) {
        hasAddress++;
      }
    });

    console.log(`All fields NULL: ${allFieldsNull}`);
    console.log(`Some fields NULL: ${someFieldsNull}`);
    console.log(`Has address in sheet: ${hasAddress}`);
  }
}

findProblematicSellers()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
