import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAA13213Property() {
  console.log('=== Syncing AA13213 Property Data ===\n');

  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const columnMapper = new ColumnMapper();

  const rows = await sheetsClient.readAll();
  const row = rows.find(r => r['売主番号'] === 'AA13213');
  
  if (!row) {
    console.log('AA13213 not found in spreadsheet');
    return;
  }

  console.log('Found AA13213 in spreadsheet');

  // Get seller from database
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA13213')
    .single();

  if (sellerError || !seller) {
    console.log('Seller not found in database');
    return;
  }

  console.log('Seller ID:', seller.id);

  // Map seller data (including valuation amounts)
  const sellerData = columnMapper.mapToDatabase(row);
  
  console.log('\nValuation amounts from sheet:');
  console.log('- valuation_amount_1:', sellerData.valuation_amount_1);
  console.log('- valuation_amount_2:', sellerData.valuation_amount_2);
  console.log('- valuation_amount_3:', sellerData.valuation_amount_3);
  
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
    console.error('Error updating seller:', updateError.message);
    return;
  }

  console.log('✅ Seller updated');

  // Extract property data
  const propertyData = columnMapper.extractPropertyData(row, seller.id);
  
  if (!propertyData) {
    console.log('No property data extracted');
    return;
  }

  console.log('\nProperty data extracted:');
  console.log('- address:', propertyData.address);
  console.log('- land_area:', propertyData.land_area);
  console.log('- building_area:', propertyData.building_area);
  console.log('- build_year:', propertyData.build_year);
  console.log('- floor_plan:', propertyData.floor_plan);
  console.log('- structure:', propertyData.structure);

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
      console.error('Error updating property:', propUpdateError.message);
    } else {
      console.log('✅ Property updated');
    }
  } else {
    // Create new property
    const { error: propCreateError } = await supabase
      .from('properties')
      .insert(propertyData);

    if (propCreateError) {
      console.error('Error creating property:', propCreateError.message);
    } else {
      console.log('✅ Property created');
    }
  }
}

syncAA13213Property()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
