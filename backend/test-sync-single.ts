import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSyncSingle() {
  console.log('=== Testing Single Row Sync ===\n');

  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const columnMapper = new ColumnMapper();

  console.log('Fetching data from spreadsheet...');
  const rows = await sheetsClient.readAll();
  console.log(`Found ${rows.length} rows\n`);

  // Test with first row that has a seller_number
  const testRow = rows.find(r => r['売主番号']);
  
  if (!testRow) {
    console.log('No row with seller_number found');
    return;
  }

  const sellerNumber = testRow['売主番号'];
  console.log(`Testing with seller: ${sellerNumber}\n`);

  try {
    // Get seller from database
    console.log('1. Fetching seller from database...');
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('seller_number', sellerNumber)
      .single();

    if (sellerError) {
      console.error('❌ Error fetching seller:', sellerError);
      return;
    }

    if (!seller) {
      console.log('⚠️ Seller not found in database');
      return;
    }

    console.log('✅ Seller found:', seller.id);

    // Map seller data
    console.log('\n2. Mapping seller data...');
    const sellerData = columnMapper.mapToDatabase(testRow);
    console.log('✅ Data mapped');
    console.log('   valuation_amount_1:', sellerData.valuation_amount_1);
    console.log('   valuation_amount_2:', sellerData.valuation_amount_2);
    console.log('   valuation_amount_3:', sellerData.valuation_amount_3);

    // Update seller
    console.log('\n3. Updating seller...');
    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        valuation_amount_1: sellerData.valuation_amount_1,
        valuation_amount_2: sellerData.valuation_amount_2,
        valuation_amount_3: sellerData.valuation_amount_3,
      })
      .eq('id', seller.id);

    if (updateError) {
      console.error('❌ Error updating seller:', updateError);
      return;
    }

    console.log('✅ Seller updated');

    // Extract property data
    console.log('\n4. Extracting property data...');
    const propertyData = columnMapper.extractPropertyData(testRow, seller.id);
    
    if (!propertyData) {
      console.log('⚠️ No property data extracted');
      return;
    }

    console.log('✅ Property data extracted');
    console.log('   address:', propertyData.address);
    console.log('   land_area:', propertyData.land_area);
    console.log('   building_area:', propertyData.building_area);
    console.log('   build_year:', propertyData.build_year);
    console.log('   floor_plan:', propertyData.floor_plan);

    // Check if property exists
    console.log('\n5. Checking if property exists...');
    const { data: existingProperty, error: propCheckError } = await supabase
      .from('properties')
      .select('id')
      .eq('seller_id', seller.id)
      .single();

    if (propCheckError && propCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking property:', propCheckError);
      return;
    }

    if (existingProperty) {
      console.log('✅ Property exists, updating...');
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
        console.error('❌ Error updating property:', propUpdateError);
        return;
      }

      console.log('✅ Property updated');
    } else {
      console.log('⚠️ Property does not exist, creating...');
      const { error: propCreateError } = await supabase
        .from('properties')
        .insert(propertyData);

      if (propCreateError) {
        console.error('❌ Error creating property:', propCreateError);
        return;
      }

      console.log('✅ Property created');
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error);
    console.error('Stack:', error.stack);
  }
}

testSyncSingle()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
